# PhoneMatch — Probes (Fase 0)

Scripts que **validam as fontes de dados antes de construir o sistema**. Cada um responde uma pergunta do plano
(`docs/PLANO_ATUALIZACAO.md`, seção 10 / Fase 0) e grava um relatório JSON em `reports/` (ignorado pelo git).

A lógica é testada com `bun test` (fetch injetável + fixtures), então os probes também servem de **especificação
executável** dos adapters que vão para o backend novo. O código segue `docs/ARQUITETURA.md`: inglês, config
centralizada com zod, objetos de parâmetros, erros tipados e Test Data Builder.

## Setup

```bash
cd tools/probes
bun install
cp .env.example .env   # preencha as chaves (o Bun lê .env automaticamente)
bun test               # 67 testes, sem rede
bun run typecheck
```

## Mercado Livre — `bun run probe:ml -- "moto g85" [CATALOG_PRODUCT_ID]`

Antes de rodar:
1. Crie a aplicação no DevCenter do ML (https://developers.mercadolivre.com.br/devcenter).
2. Em **permissões**, ative as de leitura (produtos, itens, opiniões). Sem isso, as chamadas dão `403 PolicyAgent`.
3. Copie o **Client ID** e o **Client Secret** para o `.env`.

Testa, com e sem token: `/sites/MLB/search`, `/products/search`, `/products/{id}`, `/products/{id}/items`,
`/items/{id}` (anúncio de terceiro) e `/reviews/item/{id}` (com e sem `catalog_product_id`).

| Resultado | Significado |
|---|---|
| `ok` | funciona |
| `unauthorized` | token ausente/inválido |
| `policy_blocked` | permissão do app não habilitada no DevCenter |
| `forbidden` | bloqueado mesmo com token (recurso de terceiro ou bloqueio de borda/IP) |

**Rode duas vezes:** do seu PC e pelo GitHub Actions (mova `ci/probes.yml` para `.github/workflows/probes.yml` e dispare o workflow `probes` manualmente; cadastre os secrets
`ML_CLIENT_ID`, `ML_CLIENT_SECRET` e `YOUTUBE_API_KEY` no repositório). Se o resultado só funcionar no PC, o ML está
bloqueando IP de datacenter, e isso também afeta o Render.

## YouTube — `bun run probe:yt -- "Moto G85" [--link URL ...] [--launch AAAA-MM-DD] [--pages N]`

Antes de rodar: no Google Cloud Console, ative a **YouTube Data API v3** e crie uma **chave de API**.

O que faz:
1. busca vídeos com 4 consultas ("review", "vale a pena", "depois de meses de uso", "teste de bateria");
2. pontua e seleciona até 5 vídeos **misturando fases** (lançamento / médio prazo / longo prazo, relativas ao
   primeiro vídeo do modelo ou à data `--launch`). Os links passados com `--link` entram primeiro;
3. baixa até `--pages` páginas de 100 comentários por vídeo e aplica o filtro de relevância;
4. mostra comentários relevantes por vídeo e fase, aspectos citados, relatos de dono e a cota gasta.

Rode para **3 aparelhos de marcas diferentes** (ex.: `"Moto G85"`, `"Galaxy A55"`, `"Redmi Note 13"`).
Dicas: para modelos com variantes, passe o nome exato (`"iPhone 15"` não casa com vídeos de `"iPhone 15 Pro"`). A
marca no começo é opcional (`"Motorola Moto G85"` = `"Moto G85"`).

**Cota:** cada `commentThreads.list`/`videos.list` custa 1 unidade (10.000/dia). O `search.list` é contado à parte
porque tem limite diário próprio. Um probe padrão usa 4 buscas e cerca de 11 unidades.

## Estrutura

```
shared/
  config.ts          ÚNICO leitor de variáveis de ambiente (zod, fail fast, defaults só p/ não-segredos)
  errors.ts          AppError, InvalidConfigError, ExternalServiceError (descritivo, com cause e retryable)
  http.ts            fetch injetável, classificação de respostas, mockFetcher
  report.ts          gravação de relatório + runCli (borda de erro dos CLIs)
locales/pt-BR/
  review-vocabulary.ts  vocabulário PT-BR (termos de review, aspectos, padrões) — dados, não lógica
mercadolivre/        ml.ts (lógica) · probe.ts (CLI) · ml.test.ts
youtube/
  text.ts            casamento do modelo no título (variantes, marca opcional)
  duration.ts        ISO 8601 → segundos; ID de qualquer link
  video-selection.ts relevância + fases + diversidade de canal
  comment-filter.ts  relevância de comentários, aspectos e relato de dono
  youtube-api.ts     Adapter da API + QuotaTracker
  run-probe.ts       orquestração · probe.ts (CLI)
test/
  video-candidate.builder.ts  Test Data Builder (aVideo())
ci/probes.yml        workflow do GitHub Actions (mover para .github/workflows/)
```

Variáveis opcionais (com default) estão comentadas no `.env.example`.

## Depois de rodar

Me mande os relatórios de `reports/` (ou cole a saída do terminal). Com eles eu atualizo a matriz de fontes do plano
(seção 4.1) e ajusto os pesos de `video-selection.ts` e `comment-filter.ts` com dados reais.
