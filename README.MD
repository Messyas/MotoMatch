# PhoneMatch (v2)

> Sistema inteligente e transparente de recomendação de smartphones multi-marca com análise de utilidade multicritério (MAUT), mineração bayesiana de opiniões do YouTube, busca vetorial (`pgvector` com `halfvec`) e aprendizado coletivo por amostragem de Thompson.
>
> Projetado para operar com excelência técnica dentro dos limites estritos de infraestrutura em nuvem 100% gratuita (Render + Aiven + Vercel + Gemini Free Tier).
>
> *O código legado (MotoMatch v1) está preservado na tag git [**`v1-legado`**](https://github.com/Messyas/MotoMatch/tree/v1-legado).*

---

## 🏗️ Arquitetura e Decisões de Engenharia

O PhoneMatch adota um **monólito modular** desacoplado em TypeScript/Bun, estruturado segundo os princípios da Clean Architecture e Domain-Driven Design pragmático.

```
                    ┌─────────────────────────┐
                    │    client (Next.js)     │
                    │  Vercel (Edge / Static) │
                    └────────────┬────────────┘
                                 │ HTTP / JSON
                                 ▼
                    ┌─────────────────────────┐
                    │     backend (Hono)      │
                    │   Render (Bun Runtime)  │
                    └────────────┬────────────┘
                                 │
     ┌─────────────┬─────────────┼─────────────┬─────────────┐
     ▼             ▼             ▼             ▼             ▼
 [catalog]   [recommender]    [chat]       [reviews]    [evidence]
     │             │             │             │             │
     └─────────────┴─────────────┼─────────────┴─────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   PostgreSQL + pgvector │
                    │     Aiven (Free 1 GB)   │
                    └─────────────────────────┘
```

### 1. Módulos Independentes
- **`catalog`:** Gestão de aparelhos, especificações técnicas parametrizadas e espelho do catálogo do Mercado Livre.
- **`recommender`:** Motor determinístico MAUT (*Multi-Attribute Utility Theory*), normalização contínua por percentis do catálogo e filtro de dominância de Pareto.
- **`chat`:** Interface conversacional com extração de critérios via Gemini e processamento de críticas unitárias instantâneas (*critiquing*: "mais bateria", "mais barato", "parecido").
- **`reviews`:** Ingestão de fontes públicas (YouTube Data API v3, ML e CSV), com filtro de relevância PT-BR e controle adaptativo de cotas.
- **`sentiment`:** Análise em lote de aspectos por LLM com acumuladores bayesianos incrementais $O(1)$ ponderados por meia-vida temporal.
- **`evidence`:** Divisão de comentários em sentenças informativas, geração de embeddings normalizados e busca de citações reais via `halfvec(768)` no `pgvector`.
- **`analytics`:** Sinais coletivos anônimos 👍/👎, geração de assinaturas de intenção discretizadas, placar Beta com amostragem de Thompson e rollups diários.
- **`scheduler`:** Orquestrador de tarefas em segundo plano com locks consultivos PostgreSQL (`pg_try_advisory_lock`), prioridade adaptativa e catch-up na inicialização.
- **`status`:** Endpoint público de auditoria e transparência do sistema.

---

## ⚡ Mitigações para Infraestrutura Gratuita

| Limitação do Plano Free | Risco | Solução de Engenharia Implementada |
|---|---|---|
| **Render Web Service** (desliga após inatividade) | Cold start de 30–60 segundos ao abrir a página | Frontend dispara `GET /health` cedo, exibe badge explicativo não-bloqueante e carrega o catálogo de um snapshot estático gerado no build (`public/catalog-snapshot.json`). |
| **Aiven PostgreSQL** (1 GB de armazenamento) | Banco lotar com reviews brutos e embeddings | Trechos limitados aos top 20 por aparelho/aspecto; embeddings em `halfvec` (1.5 KB vs 3 KB); `retention_sweep` diário expurga dados brutos > 30 dias. |
| **YouTube Data API** (10.000 unidades/dia) | Estourar cota de chamadas de API | `commentThreads.list` custa apenas 1 unidade; `search.list` executado apenas periodicamente com intervalo adaptativo dobrando em canais com poucas novidades. |
| **Gemini API** (Free Tier RPM/RPD) | Rate limits e cota esgotada | Análise em lotes de 10 a 20 comentários por requisição; fallback resiliente por regras para garantia de 100% de disponibilidade. |

---

## 🧪 Estratégia de Testes (TDD Rigoroso)

O projeto mantém uma suíte com **181 testes automatizados offline** com tempo de execução inferior a 2 segundos:

- **67 testes nos Probes de Validação** (`tools/probes`): Validação de contratos, relevância semântica e mistura temporal de vídeos.
- **114 testes no Backend** (`backend`): Cobertura de domínio, motor MAUT, acumulador bayesian, amostragem de Thompson, embeddings vetoriais e endpoints HTTP.

```bash
# Probes da Fase 0
cd tools/probes && bun test && bun run typecheck

# Backend PhoneMatch
cd backend && bun test && bun run typecheck

# Frontend Next.js
cd client && bun run lint && bun run build
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Bun](https://bun.sh/) (v1.2+)
- Docker (opcional, para PostgreSQL com `pgvector` local) ou conexão com Aiven

### 1. Configurar Variáveis de Ambiente
Crie o arquivo `backend/.env` baseado no schema `backend/src/shared/config/config.schema.ts`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/phonematch
ADMIN_KEY=sua-chave-secreta-com-pelo-menos-16-caracteres
CRON_SECRET=seu-segredo-cron-com-pelo-menos-24-caracteres
CREDENTIALS_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
GEMINI_API_KEY=sua-chave-gemini
YOUTUBE_API_KEY=sua-chave-youtube
```

### 2. Rodar o Backend
```bash
cd backend
bun install
bun run db:generate   # Gera migrações Drizzle
bun run dev           # Inicia servidor Hono em http://localhost:3000
```

### 3. Rodar o Frontend
```bash
cd client
bun install
bun run dev           # Inicia Next.js em http://localhost:3001
```

---

## 📄 Licença

Distribuído sob a licença MIT. Desenvolvido para demonstração de arquitetura resiliente, IA explicável e engenharia de software de ponta a ponta.
