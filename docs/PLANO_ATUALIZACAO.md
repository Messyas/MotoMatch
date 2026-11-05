# PhoneMatch — Plano de Atualização (v2 demonstrativa)

> Documento vivo. Última revisão: 2026-11-04.
> **Como** implementar (padrões de código, módulos, resiliência, commits): [`ARQUITETURA.md`](./ARQUITETURA.md). Regras curtas para agentes: [`/AGENTS.md`](../AGENTS.md).
> O projeto deixa de ser o **MotoMatch** (só Motorola) e passa a ser o **PhoneMatch**, que aceita **qualquer fabricante**.
> O código antigo está preservado na tag git **`v1-legado`** (commit `f758cd6`), que marca a divisão entre o sistema antigo e o novo.
>
> Objetivo: transformar o projeto num **sistema demonstrativo de portfólio**, sem login, rápido de usar,
> rodando 100% em infraestrutura gratuita e transparente sobre como opera com recursos limitados.

---

## 1. Visão geral

### 1.1 O que o sistema passa a ser

- **Painel livre.** Qualquer visitante usa o chat de recomendação, sem cadastro.
- **Qualquer celular, de qualquer marca.** Nada no motor pode depender de listas fixas de uma fabricante.
- **Cadastro de celulares** é a única área restrita, protegida por chave de admin. O aparelho entra de duas formas:
  - **espelho de catálogo**: importado de uma fonte externa (Mercado Livre `/products/{id}`, quando disponível);
  - **cadastro manual**.
- O sistema **coleta opiniões** sobre cada aparelho (YouTube, Mercado Livre, datasets, CSV, manual), faz **análise de aspectos**
  (bateria, câmera, desempenho, custo-benefício etc.) e **pontua** o aparelho.
- O motor de recomendação é **determinístico e explicável**: multicritério (MAUT) mais sinais coletivos anônimos.
- Duas abas novas e públicas:
  - **Dados de uso**: o que as pessoas procuram e quais critérios e aparelhos aparecem;
  - **Status do sistema**: jobs, cotas, próxima coleta, retenção, versão da configuração do motor.

### 1.2 O que sai

| Item | Motivo |
|---|---|
| Login, cadastro, perfis, OAuth Google, verificação de e-mail, reset de senha | Portfólio precisa de uso imediato |
| Tabelas `Usuario`, `ContaOAuth`, `EmailVerificationToken` | Idem |
| Favoritos e histórico **por usuário** no servidor | Viram `localStorage` no front |
| Redis, `connect-redis`, `express-session`, BullMQ | Sem sessão; fila passa a ser uma tabela no Postgres |
| `recommendationService` (FastAPI) e o modelo `.joblib` | Motor portado para TS; modelo treinado com dados sintéticos não agregava |
| SonarQube no compose | Opcional; pode virar job de CI |
| Colunas `promptGemini` e `respostaGemini` | Desperdício de armazenamento |

### 1.3 O que fica (e melhora)

- O **chat**: extração de critérios a partir de texto livre (Gemini), mais crítica conversacional.
- A lógica de **specs → níveis → score**, agora com normalização relativa ao catálogo.
- A **análise de aspectos por comentário** (Gemini), com orçamento e filtro de relevância.
- O front Next.js e os componentes de dispositivo, comparação e resumo de comentários.

---

## 2. Arquitetura alvo

### 2.1 Decisões

| Tema | Decisão | Justificativa |
|---|---|---|
| Estilo | **Monólito modular** em TypeScript | Um único serviço acorda (antes eram dois cold starts em cadeia, e o timeout de 4s estourava) |
| Runtime | **Bun** no runtime nativo do Render (sem Docker) | Render suporta Bun nativamente; build e boot mais rápidos, menos memória. O cold start do plano free continua dominado pelo spin-up do Render |
| HTTP | **Hono** (alternativa: manter Express 5, que roda em Bun) | Leve, nativo de Bun, tipagem boa, middlewares simples |
| Banco | **PostgreSQL na Aiven (free)** | 1 GB, 20 conexões, `pgvector`, JSON melhor, índices parciais. O schema vai encolher de qualquer forma |
| ORM | **Drizzle** (alternativa: Prisma 7) | Sem engine binária, ótimo em Bun, migrations em SQL legível |
| Front | **Next.js na Vercel** (alternativa: Cloudflare Pages com export estático) | Zero atrito com Next 15 |
| Agendamento | **GitHub Actions (cron)** chamando `POST /internal/tick` + catch-up no boot | Acorda o Render, mantém a Aiven "ativa" (ela pode desligar banco ocioso) e não depende de processo vivo |
| Scraping com browser | **Fora do escopo principal**. Se precisar, roda em GitHub Actions, nunca no Render | Chromium consome a maior parte dos 512 MB do free; e o ML bloqueia IPs de datacenter na borda |
| LLM | **Gemini (free tier)** para: extração de critérios, análise de aspectos, filtro de relevância | Já integrado; tudo com orçamento diário |

### 2.2 Módulos

```
backend/
  src/
    app.ts                 # bootstrap Hono, CORS, rotas, catch-up do scheduler
    shared/                # db (drizzle), env, logger, errors, http utils, budget/quota
    modules/
      catalog/             # aparelhos, specs, fotos, preço; CRUD admin; espelho de catálogo
      reviews/             # ingestão: adapters por fonte, dedupe, filtro de relevância
        sources/
          youtube.source.ts
          mercadolivre.source.ts
          csv.source.ts
          manual.source.ts
      sentiment/           # análise de aspectos (Gemini) + agregação bayesiana incremental
      recommender/         # MAUT, percentis, Pareto, crítica, justificativas, sinais coletivos
      chat/                # orquestração conversacional (extração de critérios, crítica)
      evidence/            # embeddings e trechos reais de comentários (pgvector)
      analytics/           # eventos anônimos, rollups diários, retenção
      scheduler/           # registro de jobs, prioridade, tick, catch-up
      status/              # endpoint agregado para a aba "Status do sistema"
    db/
      schema.ts
      migrations/
  scripts/
    calibrate-priors.ts    # roda offline sobre datasets e gera parâmetros do prior
    eval-scenarios.ts      # avalia o motor contra cenários de referência
```

Regra do monólito modular: cada módulo expõe um `index.ts` com a API pública. Um módulo só importa outro por esse arquivo,
nunca por arquivos internos. Isso mantém a opção de extrair um módulo para um serviço próprio no futuro (ex.: Zeabur).

### 2.3 Fluxo de uma busca

1. O front envia mensagem do chat, junto com o estado da conversa (critérios e pesos atuais) guardado no cliente.
2. `chat` extrai e atualiza critérios via Gemini. Se a mensagem for uma crítica ("mais bateria", "mais barato"), aplica a regra de crítica **sem** chamar LLM.
3. `recommender`:
   1. aplica as **restrições duras** (preço máximo, 5G, RAM mínima…);
   2. normaliza specs por **percentil do catálogo atual**;
   3. combina spec e opinião (score bayesiano por aspecto) numa **utilidade ponderada**;
   4. remove aparelhos **dominados (Pareto)**;
   5. soma o **bônus coletivo** (limitado);
   6. ordena e devolve o top 3.
4. `evidence` anexa de 1 a 3 trechos reais de comentários por aparelho, ligados aos aspectos pedidos.
5. `analytics` grava um evento anônimo (sem PII) e a resposta volta com uma explicação estruturada.

---

## 3. Motor de recomendação (sem ML supervisionado)

### 3.1 Restrições e utilidade multicritério (MAUT)

- **Critérios duros** eliminam aparelhos: `preco_max`, `preco_min`, `5g`, `ram_min`, `rom_min`, `tela_max`, `marca` etc.
  - Quando nada sobra, o motor **relaxa** a restrição menos importante e avisa na resposta ("não achei até R$1.500; o mais próximo custa R$1.649").
- **Critérios suaves** viram pesos `w_a` por aspecto `a ∈ {bateria, camera, desempenho, tela, armazenamento, custo_beneficio, …}`.
- A utilidade de cada aparelho `d` é:

```
U(d) = Σ_a w_a · [ λ_a · S_spec(d,a) + (1 − λ_a) · S_op(d,a) ]   +   B_coletivo(d, intenção)
```

- `S_spec` é o score de especificação normalizado (3.2) e `S_op` é o score de opinião bayesiano (3.3).
- `λ_a` é o quanto aquele aspecto depende de spec ou de opinião (config). Ex.: armazenamento depende quase só de spec; câmera é mista.
- Sem critérios suaves, o motor usa pesos padrão (perfil "equilibrado").

### 3.2 Normalização relativa ao catálogo

- Substitui as faixas fixas atuais (`>=64MP = top`, `>=6000mAh = top`, lista fixa de processadores).
- Para cada spec numérica: `S_spec = percentil(valor, distribuição do catálogo ativo)`.
- Processador: um score por benchmark quando houver. Sem benchmark, usa uma tabela de tiers versionada na config, sem `if` no código.
  Como o sistema aceita qualquer marca, a tabela precisa cobrir as famílias Snapdragon, Dimensity, Helio, Exynos, Tensor, Apple A e Unisoc.
  O admin pode informar o benchmark no cadastro para substituir o tier.
- Os percentis são recalculados sempre que o catálogo muda e guardados em cache na tabela `catalog_stats`.
  - É o "drift" do domínio: o motor se recalibra sozinho.

### 3.3 Agregação bayesiana das opiniões

Para cada (aparelho, aspecto):

```
S_op = (k · μ0_a  +  Σ_i peso_i · s_i) / (k + Σ_i peso_i)
peso_i = 0.5 ^ (idade_dias_i / meia_vida)
confiança = Σ peso_i / (k + Σ peso_i)
```

- `μ0_a` é o prior do aspecto, calibrado offline com datasets (seção 5.3).
- `k` é a força do prior (≈ quantos comentários "valem" o prior). Começa em 10.
- `meia_vida` começa em 365 dias.
- Guardar **apenas acumuladores** por (aparelho, aspecto): `soma_pesos`, `soma_pesos_x_score`, `n`, `ultima_atualizacao`.
  - O decaimento é aplicado multiplicando os acumuladores por `0.5^(Δdias/meia_vida)` antes de somar novos comentários. É uma atualização O(1), sem recalcular histórico.
- A **confiança** aparece na UI ("Bateria: 4,4 ★ — confiança alta, 312 opiniões").

### 3.4 Filtro de Pareto

- Entre os candidatos, remove `d` se existir `d'` com `d' ≥ d` em todos os aspectos ponderados **e** `preço(d') ≤ preço(d)`, com pelo menos uma desigualdade estrita.
- A UI pode mostrar "X foi descartado: Y é melhor e mais barato".

### 3.5 Crítica conversacional (critiquing)

- Críticas unitárias, por regra:
  - `mais <aspecto>`: aumenta `w_a` e adiciona a restrição suave `S(d,a) > S(ref,a)`;
  - `mais barato`: `preco_max = preço(ref) · 0.9`;
  - `parecido com este`: pesos iniciais derivados do perfil do aparelho de referência.
- O front exibe botões rápidos de crítica em cada cartão de resultado. O texto livre também funciona: o Gemini mapeia para uma dessas críticas.
- O estado da conversa (critérios, pesos, aparelho de referência) vive no cliente e vai em cada requisição. O servidor não guarda sessão.

### 3.6 Sinais coletivos anônimos

- **Assinatura de intenção** = critérios discretizados (ex.: `bat:alta|preco:<=2000|cam:media`).
- **Sinais**: 👍/👎 no resultado (forte), "ver detalhes" e "comparar" (fraco).
- Placar `Beta(α, β)` por (aparelho, assinatura) e também por aparelho global (fallback quando a assinatura tem pouco dado).
- O bônus é **limitado**: `B = ε · (amostra_Thompson − 0.5)`, com `ε` pequeno (ex.: 0,05). O sinal coletivo ajusta a ordem, mas não passa por cima das specs.
- **Anti-abuso:** um voto por (id de sessão anônimo, aparelho, assinatura) por dia, mais limite de taxa por IP.

### 3.7 Justificativas com evidência real

- Cada comentário relevante é dividido em trechos curtos. Cada trecho recebe um embedding, guardado no `pgvector` junto com o aspecto detectado.
- Na resposta, para cada aspecto pedido, o sistema busca os trechos mais similares à consulta e com sentimento coerente com o score.
- A UI mostra: *"Bateria — 'aguenta o dia todo jogando' (YouTube, mar/2026)"*.

### 3.8 Configuração versionada e cenários de referência

- Todos os parâmetros (`w` padrão, `λ_a`, `k`, `meia_vida`, `ε`, tiers de processador, regras de crítica) ficam em `engine_config`, uma tabela versionada.
- **Cenários de referência** (`docs/cenarios/*.json`): 30 a 50 personas com o top 3 esperado e restrições.
  - `scripts/eval-scenarios.ts` calcula nDCG@3 e acerto do top 1 e roda no CI a cada mudança no motor.
  - Separar uma parte dos cenários como **conjunto de validação**, que não é usado para ajustar parâmetros à mão.
- O agente LLM de calibração **não** entra agora. A estrutura acima permite adicioná-lo depois sem mudar o motor.

---

## 4. Ingestão de opiniões

### 4.1 Fontes

| Fonte | Uso | Acesso | Status |
|---|---|---|---|
| **YouTube Data API v3** | Fonte viva principal (PT-BR) | Chave de API; `commentThreads.list` = 1 unidade; cota de 10.000/dia; `search.list` tem limite próprio de 100/dia | A validar no spike |
| **Mercado Livre API** | Espelho de catálogo (`/products/search`, `/products/{id}`, `/products/{id}/items`) e talvez reviews (`/reviews/item/{id}?catalog_product_id=`) | App no DevCenter, token `client_credentials`, permissões de leitura ativadas | Reviews **não confirmados**; `/sites/MLB/search` e `/items/{id}` de terceiros dão 403 |
| **B2W-Reviews01** (CC-BY-4.0) | Calibrar priors e pesos dos aspectos (offline) | Download Hugging Face | Dataset de 2018 |
| **Amazon Reviews 2023** (Cell Phones) | Calibração complementar (EN) | Download Hugging Face; uso de pesquisa | Sem licença formal |
| **CSV** | Legado e importações pontuais | URL ou upload pelo admin | Já existe |
| **Manual** | Admin cola opiniões | UI admin | Novo |
| GSMArena, Reddit, Magalu, Amazon BR | **Não usar** por padrão | Termos restritivos, aprovação demorada ou antibot | — |

### 4.2 Pipeline

```
fonte → normalização → dedupe (hash do texto + fonte + ref externa) → filtro de relevância
      → análise de aspectos (Gemini, com orçamento) → atualização dos acumuladores bayesianos
      → divisão em trechos + embeddings (evidência) → descarte do texto bruto, conforme a retenção
```

- **Filtro de relevância (antes do LLM):**
  - descarta textos curtos, spam, "primeiro!" e comentários sobre o youtuber;
  - exige menção a aspecto ou uso, por regex e palavras-chave;
  - os que sobram passam por classificação barata no Gemini, em lote de N comentários por chamada.
- **Análise em lote:** enviar de 10 a 20 comentários por chamada ao Gemini, com saída JSON validada por `zod`. Reduz o consumo da cota.
- **YouTube:** veja a seção 4.3. A seleção de vídeos é automática, e o cadastro tem um campo opcional para colar links.

### 4.3 Seleção automática de vídeos do YouTube

**Entrada:**
- O cadastro do aparelho tem um campo opcional para **links de vídeo**. Links informados entram sempre, com prioridade máxima.
- Se nenhum link for informado, ou se forem poucos, o sistema busca sozinho (fallback automático).

**Busca:** algumas consultas por aparelho, com `regionCode=BR`, `relevanceLanguage=pt`, `type=video`.
- `"<modelo> review"`
- `"<modelo> vale a pena"`
- `"<modelo> depois de meses de uso"`
- `"<modelo> teste de bateria"`

**Relevância de cada vídeo candidato** (função pura, testada em `tools/probes/youtube`):
- **título** contém os tokens do modelo (obrigatório; "Moto G85" ≠ "Moto G84");
- **palavras de review** somam ("review", "análise", "vale a pena", "depois de X meses", "uso prolongado", "teste");
- **palavras de não-review** subtraem ("unboxing" puro, "capinha", "película", "case", "sorteio", "#shorts");
- **duração** mínima de 3 minutos (sem shorts);
- **engajamento**: `log(comentários)` vale mais que `log(views)`, porque o que interessa é o volume de opiniões;
- **diversidade**: no máximo 1 a 2 vídeos por canal.

**Mistura temporal** (antigos e novos de propósito):
- **Fase de lançamento** (0–2 meses após o primeiro vídeo do aparelho): primeiras impressões e expectativa.
- **Médio prazo** (3–9 meses): vídeos do tipo "depois de 6 meses". Aqui aparecem problemas de bateria, atualizações e aquecimento.
- **Longo prazo** (9+ meses): durabilidade e suporte de software.
- A seleção pega os melhores de **cada fase**, não os mais recentes. Assim os sentimentos de cada momento do ciclo de vida aparecem.
- Cada comentário guarda a **fase do vídeo** e a sua **própria idade relativa ao lançamento**. Na UI isso pode virar algo como "no lançamento elogiavam X; depois de meses reclamam de Y".
- Na agregação bayesiana, a fase pode ter um peso próprio (`peso_fase` na config). Ex.: opiniões de médio e longo prazo pesam um pouco mais em durabilidade e bateria.

**Reavaliação:** a cada N dias o sistema repete a busca em background. Ele procura vídeos novos de médio e longo prazo, que só passam a existir com o tempo, e troca vídeos que pararam de render comentários.

### 4.4 Espelho de catálogo (Mercado Livre)

1. O admin digita o modelo, o sistema chama `/products/search?q=` e mostra as opções.
2. O admin escolhe um produto e o sistema importa nome, fotos e atributos de `/products/{id}`, e o preço mediano de `/products/{id}/items`.
3. O aparelho guarda `source=ml_catalog` e o `external_id`. Um job atualiza o preço periodicamente.
4. Se a API falhar, o cadastro manual continua disponível com os mesmos campos.

---

## 5. Operação com recursos limitados

> Implementação detalhada (lotes com checkpoint, lease, idempotência, índices, cold start, exceções): `ARQUITETURA.md` §16.

### 5.1 O que precisa sobreviver ao "sono"

Nada importante vive em memória. Tudo no Postgres:

| Estado | Onde |
|---|---|
| Última execução, próxima execução, cursor e falhas de cada job | `job` / `job_run` |
| Cotas usadas no dia (Gemini, YouTube, ML) | `quota_usage` (por dia e por provedor) |
| Tokens externos (ML `access_token` e `expires_at`) | `integration_credential` (criptografado com chave em env) |
| Cursores de coleta (ex.: `pageToken` do YouTube por vídeo) | `review_source_link.cursor` |
| Acumuladores bayesianos | `device_aspect_stats` |
| Percentis do catálogo | `catalog_stats` |
| Configuração do motor | `engine_config` (versionada) |

### 5.2 Scheduler

- **Gatilhos:**
  1. GitHub Actions `cron` (ex.: a cada 6 h) chama `POST /internal/tick` com header `X-Cron-Secret`;
  2. **catch-up no boot**: ao iniciar, o servidor roda um tick em background se houver job vencido;
  3. **tick oportunista** após requisições, com limite de 1 a cada 10 min.
- O **lock** é feito com `pg_try_advisory_lock`, para que ticks concorrentes não dupliquem trabalho.
- **Orçamento por tick:** tempo máximo (ex.: 60 s) e cotas. O job para limpo e salva o cursor.
- **Prioridade de coleta por aparelho:**

```
prioridade = staleness_norm × (1 + popularidade_7d_norm) × (1 + escassez_reviews_norm)
```

- **Intervalo adaptativo:** quando uma coleta traz poucos comentários novos, o próximo intervalo dobra (1 d → 2 d → 4 d … máx. 30 d). Quando traz muitos, o intervalo volta para 1 d.
- **Jobs:**
  - `collect_reviews`;
  - `analyze_pending`;
  - `embed_pending`;
  - `refresh_prices`;
  - `recompute_catalog_stats` (disparado por mudança no catálogo);
  - `rollup_analytics` (diário);
  - `retention_sweep` (diário);
  - `keepalive_db` (implícito em qualquer tick).

### 5.3 Calibração offline dos priors

- `scripts/calibrate-priors.ts` roda localmente uma vez, ou quando você quiser, sobre o B2W (e opcionalmente o Amazon 2023):
  1. filtra a categoria de celulares;
  2. extrai aspectos (por palavras-chave ou por amostra pelo Gemini);
  3. calcula `μ0_a`, a variância e a importância relativa de cada aspecto na nota geral.
- A saída é um JSON pequeno com os parâmetros, que entra em `engine_config` com a fonte documentada.

### 5.4 Política de retenção

| Dado | Retenção | Antes de apagar |
|---|---|---|
| Eventos brutos de busca e feedback | 30 dias | Rollup diário em `analytics_daily` |
| ID de sessão anônimo | 30 dias (cookie e eventos) | — |
| Placar Beta (α, β) por aparelho e intenção | Permanente, com decaimento mensal (α, β × 0,9) | — |
| Texto bruto de comentário | Até ser analisado + 90 dias | Aspectos, trechos de evidência e acumuladores já gravados |
| Trechos de evidência e embeddings | Top N por (aparelho, aspecto), ex.: 20 | Os piores ou mais antigos saem primeiro |
| `job_run` | 30 dias | Contadores agregados no `job` |
| Falhas de análise | 7 dias | — |

- **Limite de armazenamento:** `retention_sweep` mede `pg_database_size()`. Acima de 70% do 1 GB, reduz as janelas automaticamente e registra isso no status.

### 5.5 Aba "Status do sistema" (pública)

- Estado do servidor: "acordou há X min" (cold start explicado) e última vez que o cron rodou.
- Para cada job: última execução, resultado, próxima prevista e o motivo ("intervalo dobrou: só 2 comentários novos").
- Cotas do dia: Gemini, YouTube e ML, com barra de progresso.
- Fila: comentários aguardando análise e embedding.
- Armazenamento: tamanho do banco, linhas por tabela principal e janelas de retenção ativas.
- Motor: versão do `engine_config` e resultado da última avaliação nos cenários (nDCG@3).
- Uma linha do tempo curta com os últimos eventos.

### 5.6 Aba "Dados de uso" (pública)

- Rollups diários: buscas por dia, critérios mais pedidos, aparelhos mais recomendados, taxa de 👍.
- Critérios que o chat extraiu e descartou (já existe parecido em `SelecaoPesquisa`).
- Nenhum dado pessoal; só agregados.

---

## 6. Modelo de dados (rascunho, Postgres + Drizzle)

```
device(id, brand, model, price, photos jsonb, source, external_id, active, created_at, updated_at)
device_spec(device_id, key, value_num, value_text)                 -- substitui Caracteristica + N:N
catalog_stats(key, percentiles jsonb, computed_at)

review_source_link(id, device_id, provider, external_ref, cursor, next_due_at, interval_days, last_new_count)
review(id, device_id, provider, external_ref, author_hash, rating, content, published_at,
       video_phase, days_since_launch,
       status[pending|analyzing|irrelevant|analyzed|failed], lease_until, attempts, next_attempt_at,
       error_code, error_message, analyzed_at, aggregated_at, content_purged_at)
       -- UNIQUE(provider, external_ref); índices parciais p/ fila e agregação (ARQUITETURA §16.5)
review_aspect(review_id, aspect, score smallint, sentiment)      -- UNIQUE(review_id, aspect)
device_aspect_stats(device_id, aspect, sum_w, sum_wx, n, updated_at)
evidence_snippet(id, review_id, chunk_index, device_id, aspect, text, sentiment, provider, published_at, embedding halfvec(768))
                                                               -- UNIQUE(review_id, chunk_index); HNSW em embedding

search_event(id, session_id, intent_sig, criteria jsonb, discarded jsonb, result_ids text[], created_at)
feedback_event(id, session_id, device_id, intent_sig, kind[up|down|detail|compare], created_at)
collective_score(device_id, intent_sig, alpha, beta, updated_at)
analytics_daily(day, metric, dim, value)

job(name, last_run_at, last_status, next_due_at, consecutive_failures, meta jsonb)
job_run(id, job_name, window_start, started_at, finished_at, status[ok|partial|failed|skipped], summary jsonb)
                                                               -- UNIQUE(job_name, window_start) p/ jobs diários
quota_usage(day, provider, used, limit)
integration_credential(provider, payload_encrypted, expires_at)
engine_config(version, params jsonb, created_at, note, eval_result jsonb, active)
```

- **Dados iniciais:** o banco antigo não está disponível. A base inicial vem dos CSVs antigos, se for possível recuperá-los (importados pelo adapter `csv`), mais o cadastro novo dos aparelhos.
- `review` ganha `video_phase` (`launch|mid|long|unknown`) e `days_since_launch`, para a mistura temporal (4.3).

---

## 7. API (rascunho)

```
GET  /v1/devices                     # lista pública (com scores e confiança)
GET  /v1/devices/:id                 # detalhe + aspectos + evidências
POST /v1/chat                        # { messages, state } -> { reply, state, results[] }
POST /v1/recommend                   # chamada direta do motor (sem LLM)
POST /v1/feedback                    # { deviceId, intentSig, kind }
GET  /v1/analytics                   # agregados para "Dados de uso"
GET  /v1/status                      # tudo da aba "Status do sistema"
GET  /health                         # leve, sem tocar no banco

# admin (header X-Admin-Key)
POST   /v1/admin/devices             # manual
POST   /v1/admin/devices/import      # espelho de catálogo (ML)
GET    /v1/admin/catalog/search?q=   # proxy para /products/search
PUT    /v1/admin/devices/:id
DELETE /v1/admin/devices/:id
POST   /v1/admin/devices/:id/sources # vincular vídeos do YouTube / item do ML
POST   /v1/admin/reviews/import      # CSV / manual
POST   /v1/admin/jobs/:name/run      # forçar job

# interno
POST /internal/tick                  # header X-Cron-Secret
```

---

## 8. Front-end

- **Remover:** `login`, `signup`, `auth`, `verify-email`, `resend-email`, `forgot-password`, `reset-password`, `conta`, `admin/users`, `admin/dashboard-users`.
- **Manter e ajustar:** `chat` (agora com o estado da conversa no cliente), `dispositivo`, comparação.
- **Favoritos:** passam para `localStorage`, sem servidor.
- **Novas telas:**
  - `/status`: aba "Status do sistema";
  - `/dados`: aba "Dados de uso", reaproveitando os gráficos de `admin/_components`;
  - `/admin`: pede a chave uma vez e guarda em `sessionStorage`. Contém cadastro manual, importação de catálogo e vínculo de fontes.
- **Cartão de resultado:**
  - score, explicação (spec × opinião × coletivo) e confiança por aspecto;
  - trechos de evidência;
  - botões de crítica ("mais bateria", "mais barato", "parecido");
  - 👍/👎.
- **Cold start:**
  - ao abrir o site, o front dispara `GET /health`;
  - enquanto o backend acorda, mostra um estado "acordando o servidor (plano gratuito) ~30 s" e o catálogo de um snapshot estático gerado no build (`public/catalog-snapshot.json`);
  - assim a primeira tela nunca fica vazia.

---

## 9. Deploy

| Peça | Onde | Notas |
|---|---|---|
| Backend | Render Web Service, runtime **Bun nativo**, plano free | Build `bun install && bun run build`; start `bun run start`; health check em `/health` |
| Front | Vercel (free) | `NEXT_PUBLIC_API_URL` |
| Banco | Aiven PostgreSQL free (1 GB, 20 conexões) | Habilitar `pgvector`; pool pequeno (máx. 5) no app |
| Cron | GitHub Actions (`schedule`) | `curl -X POST $API/internal/tick -H "X-Cron-Secret: ..."`; segredos no repositório |
| CI | GitHub Actions | lint, testes, `eval-scenarios`, build |

**Variáveis de ambiente (backend):**
- `DATABASE_URL`
- `ADMIN_KEY`
- `CRON_SECRET`
- `CREDENTIALS_ENC_KEY`
- `GEMINI_API_KEY`
- `YOUTUBE_API_KEY`
- `ML_CLIENT_ID`, `ML_CLIENT_SECRET`
- `CORS_ORIGIN`
- `TICK_MAX_SECONDS`

---

## 10. Fases de execução

### Fase 0 — Spikes de validação (antes de codar o resto)
- [ ] **Mercado Livre:** criar o app, ativar permissões e rodar `tools/probes/mercadolivre`. O script testa `/products/search`, `/products/{id}`, `/products/{id}/items` e `/reviews/item/{id}?catalog_product_id=`, do PC e de um IP de nuvem (GitHub Actions).
- [ ] **YouTube:** criar a chave e rodar `tools/probes/youtube` para 3 aparelhos reais (de marcas diferentes).
  Medir: vídeos por fase, comentários por vídeo, % relevantes após o filtro e unidades de cota gastas.
- [ ] **Gemini:** confirmar os limites atuais do free tier (RPM/RPD) para o modelo de texto e para embeddings.
- [ ] **Aiven:** criar o Postgres free, confirmar o `pgvector` e a latência a partir do Render.
- **Critério de saída:** a matriz de fontes da seção 4.1 atualizada com resultados reais.

### Fase 1 — Fundação do monólito
- [x] Tag `v1-legado` criada e publicada no `origin` (`git push origin v1-legado`).
- [x] Novo backend Bun + Hono + Drizzle, reescrito do zero na pasta `backend/`.
- [x] Renomear o projeto para **PhoneMatch** (README, `package.json`, títulos, metadados do front).
- [x] Seguir `ARQUITETURA.md` (módulos, patterns, config, erros, um commit por feature).
- [x] Desenvolvimento com testes primeiro (TDD): `bun test` para domínio e motor, testes de contrato para os adapters de fontes com fixtures.
- [x] Schema Postgres (seção 6) com migrations geradas via Drizzle.
- [x] Remoção de auth, usuários, Redis e BullMQ; guarda `X-Admin-Key`.
- [x] Catálogo: CRUD admin manual e `GET /v1/devices`.
- [x] Endpoint de health check `/health` leve para o boot do Render.

### Fase 2 — Motor de recomendação em TS
- [x] Port de `specs`, `preferences` e `scoring` do Python para TypeScript, com normalização por percentis do catálogo (3.2).
- [x] Motor de recomendação multicritério (MAUT) (3.1), filtro de dominância de Pareto (3.4) e regras de crítica (3.5).
- [x] Endpoint direto `POST /v1/recommend` com `RecommendationQueryBuilder`.
- [x] Cenários de referência (`docs/cenarios/personas.json`) e `eval-scenarios` (3.8).
- [x] Módulo `chat` com endpoint `POST /v1/chat`, extração de critérios (Gemini com fallback por regras) e crítica conversacional rápida sem chamada LLM.

### Fase 3 — Ingestão de opiniões
- [x] Adapters YouTube, ML, CSV e manual.
- [x] Filtro de relevância, análise de aspectos em lote e controle de cota com acumulador Bayesiano idempotente.
- [x] Espelho de catálogo do ML no admin (`GET /v1/admin/catalog/search` e vínculo de fontes).
- [x] Calibração offline dos priors (`scripts/calibrate-priors.ts`).

### Fase 4 — Scheduler e status
- [ ] Tabelas `job`, `job_run` e `quota_usage`; advisory lock; tick e catch-up.
- [ ] Prioridade e intervalo adaptativo.
- [ ] Workflow do GitHub Actions (cron).
- [ ] `GET /v1/status` e a aba Status.

### Fase 5 — Aprendizado coletivo e retenção
- [ ] Eventos anônimos, feedback 👍/👎 e placar Beta com Thompson (3.6).
- [ ] Rollups diários, `retention_sweep` e limite de armazenamento (5.4).
- [ ] Aba "Dados de uso".

### Fase 6 — Evidências
- [ ] Divisão em trechos, embeddings e `pgvector`; seleção de trechos na resposta (3.7).

### Fase 7 — Front e acabamento
- [ ] Limpeza das telas de auth, novo cartão de resultado, críticas, favoritos locais, snapshot para cold start.
- [ ] Testes E2E (Cypress) dos fluxos principais.
- [ ] README novo com a arquitetura, as decisões e os limites do plano gratuito, explicados para quem visita o portfólio.

---

## 11. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Reviews do ML indisponíveis | YouTube como fonte principal; ML só para o catálogo |
| ML bloqueia IP de datacenter também na API | Espelho de catálogo opcional; cadastro manual completo |
| Free tier do Gemini muda ou reduz | Orçamento diário, análise em lote, filtro antes do LLM e interface de análise trocável (já existe) |
| Aiven desliga o banco por inatividade | Cron a cada 6 h toca o banco; aviso no status |
| Cold start do Render (~30–60 s) | Snapshot estático no front, `/health` disparado cedo e mensagem explicativa |
| Comentários do YouTube com ruído | Filtro de relevância e peso menor por fonte (`peso_fonte` na config) |
| Pouco tráfego para sinais coletivos | Bônus limitado; o motor funciona bem sem eles |
| 1 GB de banco | Retenção agressiva, limite de evidências por aspecto, monitoramento no status |

---

## 12. Decisões tomadas

- Nome: **PhoneMatch**; aceita **qualquer fabricante**.
- Código antigo preservado na tag **`v1-legado`**; o backend novo é reescrito do zero.
- Vídeos do YouTube: **automático**, com campo opcional de links no cadastro e **mistura de fases** (lançamento, médio e longo prazo).
- O usuário cria as contas (ML DevCenter, Google Cloud/YouTube, Aiven, Render, Vercel).
- Banco antigo indisponível; o usuário vai tentar recuperar os CSVs.
- TDD: os scripts de teste (`tools/probes`) já nascem com testes (`bun test`).

## 13. Dúvidas em aberto

1. **ORM:** Drizzle (recomendado) ou Prisma 7?
2. **Framework HTTP:** Hono (recomendado) ou Express 5?
3. **Specs de qualquer marca:** de onde vêm as especificações quando o aparelho não está no catálogo do ML?
   - Atributos do ML `/products/{id}`, se o teste passar;
   - cadastro manual;
   - GSMArena **não**, por causa dos termos.
   - Preciso saber se o cadastro manual completo é aceitável como fallback.
4. **Embeddings:** modelo de embeddings do Gemini (a confirmar no teste que é gratuito) ou modelo local pequeno?
5. **Domínio:** próprio ou subdomínios da Vercel e do Render?
6. **Idioma da UI:** só PT-BR ou PT-BR + EN?
7. **Repositório:** continua no mesmo repo (renomeado para `phonematch`) ou um repo novo, com o antigo arquivado?
