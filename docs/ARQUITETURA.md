# PhoneMatch — Especificação de Arquitetura e Padrões de Código

> **Público-alvo:** qualquer desenvolvedor ou **agente de IA** que for implementar ou alterar código neste repositório.
> Leia este documento **inteiro** antes de escrever código. O *quê* construir está em
> [`PLANO_ATUALIZACAO.md`](./PLANO_ATUALIZACAO.md); este documento define o **como**.
>
> As regras marcadas com **DEVE** são obrigatórias. As marcadas com **PREFIRA** são o padrão, salvo justificativa
> registrada no PR ou commit.

---

## 0. Resumo em 12 regras

1. **Monólito modular:** um só deploy, módulos com fronteiras explícitas. Um módulo só importa outro pelo `index.ts` dele.
2. **Código 100% em inglês** (identificadores, arquivos, comentários, logs, mensagens de erro internas, commits).
   PT-BR só em textos para o usuário final (arquivos de mensagens) e em vocabulário de domínio (listas de palavras-chave).
3. **Nada de variável de ambiente fora de `shared/config`.** É proibido usar `process.env` / `Bun.env` em qualquer outro lugar.
   Também é proibido deixar URL, chave, limite ou timeout espalhado no código.
4. **No máximo 3 parâmetros posicionais.** Acima disso, use um **objeto de parâmetros** tipado. Use **Builder** quando a
   construção tiver muitos opcionais, invariantes ou passos.
5. **Design patterns explícitos e nomeados** (Strategy, Adapter, Repository, Factory, Builder, Pipeline, Decorator,
   Observer, Command, Facade), aplicados **só onde resolvem um problema real**.
6. **SOLID sem overengineering:** só crie uma interface quando existir uma fronteira de I/O ou ≥ 2 implementações reais.
   Nada de abstração "para o futuro".
7. **Domínio puro:** `domain/` não faz I/O, não importa framework e não lê relógio global (o `Clock` é injetado).
8. **Injeção de dependência manual** via construtor, montada no *composition root*. Sem container de DI e sem singletons globais.
9. **Validação na borda com `zod`:** HTTP, env, respostas de APIs externas e saídas de LLM.
10. **TDD:** teste primeiro para domínio e casos de uso. Testes não acessam rede.
11. **Idiomas do framework primeiro:** Hono, Drizzle, Next.js e React Query são usados do jeito que a documentação deles recomenda.
12. **Um commit por feature finalizada** (Conventional Commits). Ao terminar uma feature, o agente **para** e informa
    os comandos de commit (seção 14).
13. **O processo pode morrer a qualquer instante.** Todo trabalho de fundo roda em **lotes pequenos e transacionais**,
    com **checkpoint no banco**, e é **idempotente**. Exceções são tratadas nas bordas, com erros tipados e
    descritivos (seção 16).

---

## 1. Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Runtime | **Bun** (≥ 1.2) | Runtime nativo no Render, sem Docker |
| HTTP | **Hono** + `@hono/zod-validator` | Rotas por módulo, `app.route()` |
| Banco | **PostgreSQL** (Aiven) + **pgvector** | |
| ORM | **Drizzle ORM** + `drizzle-kit` | Schema em TS, migrations SQL versionadas |
| Validação | **zod** | Env, DTOs HTTP, payloads externos, saída de LLM |
| LLM | Gemini (API REST) | Sempre atrás de uma interface (`SentimentAnalyzer`, `CriteriaExtractor`) |
| Testes | `bun test` | Unit, use case, contrato de adapter, HTTP (`app.request`) |
| Front | **Next.js (App Router)** + React Query + Tailwind/shadcn | Vercel |
| Lint/format | Biome (ou ESLint + Prettier, decidir uma vez) | Roda no CI |

---

## 2. Estrutura de diretórios

```
/
├─ AGENTS.md                  # regras curtas para agentes (aponta para este doc)
├─ docs/
│  ├─ PLANO_ATUALIZACAO.md    # o QUÊ
│  ├─ ARQUITETURA.md          # o COMO (este arquivo)
│  └─ cenarios/               # cenários de referência do motor (JSON)
├─ backend/
│  ├─ src/
│  │  ├─ main.ts              # entrypoint: loadConfig() -> createApp() -> Bun.serve
│  │  ├─ app.ts               # COMPOSITION ROOT: instancia módulos e liga dependências
│  │  ├─ shared/              # infraestrutura transversal, SEM regra de negócio
│  │  │  ├─ config/           # config.schema.ts, load-config.ts
│  │  │  ├─ db/               # client.ts, schema.ts (re-export dos schemas dos módulos), transaction.ts
│  │  │  ├─ http/             # error-handler.ts, admin-auth.middleware.ts, rate-limit.middleware.ts
│  │  │  ├─ events/           # event-bus.ts (Observer in-process)
│  │  │  ├─ errors/           # app-error.ts e subclasses
│  │  │  ├─ logging/          # logger.ts (interface + implementação)
│  │  │  ├─ time/             # clock.ts (Clock interface, SystemClock, FixedClock p/ testes)
│  │  │  └─ quota/            # quota-guard.ts (Decorator de orçamento por provedor)
│  │  ├─ modules/
│  │  │  ├─ catalog/
│  │  │  ├─ reviews/
│  │  │  ├─ sentiment/
│  │  │  ├─ recommender/
│  │  │  ├─ chat/
│  │  │  ├─ evidence/
│  │  │  ├─ analytics/
│  │  │  ├─ scheduler/
│  │  │  └─ status/
│  │  └─ locales/
│  │     └─ pt-BR/            # vocabulário de domínio em PT-BR (keywords, termos de review)
│  ├─ drizzle/                # migrations geradas
│  ├─ test/                   # builders e fakes compartilhados entre testes
│  ├─ scripts/                # calibrate-priors.ts, eval-scenarios.ts, migrate-csv.ts
│  ├─ drizzle.config.ts
│  └─ package.json
├─ client/                    # Next.js
└─ tools/probes/              # spikes da Fase 0 (validação de fontes)
```

### 2.1 Anatomia de um módulo

```
modules/reviews/
├─ index.ts                    # FACADE: única porta de entrada pública do módulo
├─ reviews.module.ts           # FACTORY: createReviewsModule(deps) -> { routes, api, jobs }
├─ domain/                     # regras puras, sem I/O
│  ├─ review.ts                # entidade / tipos
│  ├─ relevance-filter.ts      # funções puras
│  └─ review-source.ts         # PORT (interface Strategy) quando há I/O externo
├─ application/                # casos de uso (orquestram domínio + portas)
│  ├─ collect-reviews.use-case.ts
│  └─ import-csv-reviews.use-case.ts
├─ infrastructure/             # ADAPTERS concretos
│  ├─ reviews.schema.ts        # tabelas Drizzle do módulo
│  ├─ review.repository.ts     # REPOSITORY (Drizzle)
│  ├─ youtube.review-source.ts # ADAPTER + STRATEGY
│  └─ mercadolivre.review-source.ts
├─ http/
│  ├─ reviews.routes.ts        # rotas Hono do módulo
│  └─ reviews.dto.ts           # schemas zod de entrada/saída
└─ __tests__/                  # ou *.test.ts ao lado do arquivo (escolha uma; padrão: ao lado)
```

**Proporcionalidade:** um módulo pequeno (ex.: `status`) pode ter só `index.ts`, um use case e `http/`. Só crie as
pastas que forem usadas.

---

## 3. Regras de dependência

### 3.1 Entre camadas (dentro de um módulo)

| De ↓ / Para → | domain | application | infrastructure | http | shared |
|---|---|---|---|---|---|
| **domain** | ✅ | ❌ | ❌ | ❌ | só `shared/errors`, `shared/time` (tipos) |
| **application** | ✅ | ✅ | ❌ (usa portas do domain) | ❌ | ✅ |
| **infrastructure** | ✅ | ❌ | ✅ | ❌ | ✅ |
| **http** | ✅ (tipos) | ✅ | ❌ | ✅ | ✅ |

- A ligação entre `application` e `infrastructure` acontece **apenas** no `<module>.module.ts` (factory do módulo).

### 3.2 Entre módulos

- **DEVE:** importar outro módulo **somente** via `modules/<outro>/index.ts`. Um import como
  `modules/catalog/infrastructure/...` dentro de `modules/reviews` é erro de arquitetura.
- **Comunicação síncrona** (preciso de um dado agora): chamar a API pública exposta pelo outro módulo
  (`catalog.api.findDeviceById`). O `index.ts` exporta **tipos e a interface da API**, nunca repositórios.
- **Comunicação assíncrona** (aconteceu algo): **evento de domínio** no `EventBus` (seção 6.7).
  Ex.: `catalog` emite `device.changed`, e `recommender` recalcula os percentis.
- **Tabelas pertencem a um módulo.** Só o dono escreve. Leitura direta de tabela de outro módulo é proibida,
  com exceção de `analytics` e `status`, que podem ter *read models* (consultas SQL somente leitura) documentados no
  `index.ts` deles.
- **Ciclos são proibidos.** Se A precisa de B e B precisa de A, um dos lados vira evento.
- **Verificação:** o CI roda um script (`scripts/check-boundaries.ts`) ou regra de lint que falha em imports que violem 3.2.

### 3.3 Grafo de dependências permitido

```
chat ──► recommender ──► catalog
  │           │  ▲            ▲
  │           ▼  │            │
  │       sentiment ◄── reviews ──► (catalog)
  │           ▲
  └──► evidence ◄── reviews (evento review.analyzed)

analytics ◄── eventos (search.performed, feedback.given)
scheduler ──► (dispara Commands registrados pelos módulos; não conhece regras deles)
status ──► read models de scheduler, analytics, reviews, recommender
```

---

## 4. Catálogo de módulos

| Módulo | Responsabilidade | API pública (exemplos) | Tabelas | Emite | Consome |
|---|---|---|---|---|---|
| `catalog` | Aparelhos, specs, preço, espelho de catálogo, CRUD admin | `findDeviceById`, `listActiveDevices`, `getCatalogSnapshot` | `device`, `device_spec` | `device.changed` | — |
| `reviews` | Ingestão de opiniões (fontes, dedupe, relevância, retenção do texto bruto) | `enqueueCollection`, `importReviews` | `review`, `review_source_link` | `review.ingested` | `device.changed` |
| `sentiment` | Análise de aspectos (LLM) e agregação bayesiana incremental | `getAspectScores(deviceIds)` | `review_aspect`, `device_aspect_stats` | `review.analyzed` | `review.ingested` |
| `recommender` | MAUT, percentis, Pareto, crítica, bônus coletivo, config versionada | `recommend(query)`, `applyCritique(...)` | `catalog_stats`, `engine_config`, `collective_score` | `search.performed` | `device.changed`, `feedback.given` |
| `chat` | Conversa: extrai critérios (LLM), mapeia crítica, chama o recommender | `handleMessage(input)` | — (stateless) | — | — |
| `evidence` | Trechos e embeddings; seleção de citações por aspecto | `findEvidence(query)` | `evidence_snippet` | — | `review.analyzed` |
| `analytics` | Eventos anônimos, feedback, rollups, retenção | `recordFeedback`, `getUsageDashboard` | `search_event`, `feedback_event`, `analytics_daily` | `feedback.given` | `search.performed` |
| `scheduler` | Registro de jobs, lock, prioridade, tick, catch-up, cotas | `registerJob`, `tick` | `job`, `job_run`, `quota_usage` | — | — |
| `status` | Agrega dados para a aba Status | `getSystemStatus` | — | — | read models |

---

## 5. Composition root e injeção de dependência

- **DEVE:** existir **um** lugar que instancia tudo: `src/app.ts`.
- **DEVE:** dependências entram **pelo construtor**, como um objeto (`deps`), nunca via import de instância global.
- **PROIBIDO:** `export const db = ...` lido diretamente por módulos, `new GeminiClient()` dentro de use case,
  ou singleton com estado.

```ts
// src/app.ts
export function createApp(config: AppConfig) {
  const clock = new SystemClock();
  const logger = createLogger(config.log);
  const db = createDatabase(config.database);
  const events = new InProcessEventBus(logger);
  const quotas = new QuotaRegistry({ db, clock, limits: config.quotas });

  const catalog = createCatalogModule({ db, events, clock, config: config.catalog });
  const sentiment = createSentimentModule({ db, events, clock, quotas, config: config.gemini });
  const reviews = createReviewsModule({ db, events, clock, quotas, catalog: catalog.api, config: config.reviews });
  const recommender = createRecommenderModule({ db, events, catalog: catalog.api, sentiment: sentiment.api });
  // ... demais módulos

  const scheduler = createSchedulerModule({ db, clock, logger, jobs: [...reviews.jobs, ...sentiment.jobs] });

  const app = new Hono();
  app.onError(createErrorHandler(logger));
  app.route("/v1/devices", catalog.routes.public);
  app.route("/v1/admin/devices", withAdminAuth(config.admin, catalog.routes.admin));
  // ...
  return { app, scheduler };
}
```

```ts
// src/main.ts
const config = loadConfig();             // falha rápido se env inválido
const { app, scheduler } = createApp(config);
scheduler.catchUpInBackground();
export default { port: config.server.port, fetch: app.fetch };
```

---

## 6. Design patterns — quando e como

> Nomeie o pattern no código quando ele não for óbvio (nome do arquivo/classe ou um comentário de uma linha).
> **Não** aplique um pattern sem o problema que ele resolve.

### 6.1 Parameter Object (padrão para > 3 parâmetros)

**Regra:** função ou método com mais de 3 parâmetros **DEVE** receber um objeto tipado. Parâmetros booleanos
"soltos" são proibidos, porque `send(x, true, false)` é ilegível.

```ts
// ❌ Errado
scoreVideo(video, model, launchDate, minDuration, perChannel, weights);

// ✅ Certo
interface ScoreVideoInput {
  video: VideoCandidate;
  model: string;
  launchDate: string;
  options?: Partial<SelectionOptions>;
}
scoreVideo({ video, model, launchDate });
```

### 6.2 Builder

**Use quando:** o objeto tiver muitos campos opcionais, combinações com invariantes, construção em passos ou
precisar de defaults consistentes. **Não use** para objetos simples, onde um literal tipado já é legível (idioma do
TypeScript).

Usos previstos:
- `RecommendationQueryBuilder`: monta a consulta do motor a partir do chat e das críticas.
- `EngineConfigBuilder`: deriva uma versão nova da configuração a partir da atual.
- **Test Data Builders** (`aDevice()`, `aReview()`) em `backend/test/builders/`: o uso mais comum e o mais valioso.

```ts
// modules/recommender/domain/recommendation-query.builder.ts
export class RecommendationQueryBuilder {
  private constraints: HardConstraint[] = [];
  private weights: AspectWeights = DEFAULT_WEIGHTS;
  private reference?: DeviceId;
  private limit = 3;

  withMaxPrice(priceCents: number): this {
    this.constraints.push({ kind: "maxPrice", value: priceCents });
    return this;
  }

  require5g(): this {
    this.constraints.push({ kind: "requires5g" });
    return this;
  }

  prioritize(aspect: Aspect, weight: number): this {
    this.weights = { ...this.weights, [aspect]: weight };
    return this;
  }

  similarTo(deviceId: DeviceId): this {
    this.reference = deviceId;
    return this;
  }

  build(): RecommendationQuery {
    return RecommendationQuery.create({
      constraints: this.constraints,
      weights: normalizeWeights(this.weights),
      reference: this.reference,
      limit: this.limit,
    }); // valida invariantes (ex.: pesos somam 1, sem restrições contraditórias)
  }
}

const query = new RecommendationQueryBuilder()
  .withMaxPrice(200_000)
  .prioritize("battery", 0.5)
  .require5g()
  .build();
```

```ts
// backend/test/builders/device.builder.ts
export const aDevice = () => new DeviceBuilder();
const device = aDevice().withBrand("Motorola").withModel("Moto G85").withBatteryMah(5000).build();
```

### 6.3 Strategy

**Use quando:** existirem várias formas intercambiáveis de fazer a mesma coisa, escolhidas por configuração ou por dado.

- `ReviewSource` (YouTube, Mercado Livre, CSV, manual): `collect(link, cursor) -> ReviewBatch`
- `SentimentAnalyzer` (Gemini; futuramente outro modelo)
- `CriteriaExtractor` (Gemini; fallback por regex)
- `CritiqueRule` (`moreOf(aspect)`, `cheaper`, `similarTo`)
- `EmbeddingProvider`

```ts
// modules/reviews/domain/review-source.ts (PORT)
export interface ReviewSource {
  readonly provider: ReviewProvider;
  collect(request: CollectRequest): Promise<ReviewBatch>;
}
```

### 6.4 Adapter

**Use em toda integração externa.** O adapter traduz a API de terceiros para os tipos do domínio e **valida a resposta
com zod**. Nenhum tipo de terceiro (formato de resposta do YouTube, do ML, do Gemini) vaza para fora de `infrastructure/`.

```ts
// modules/reviews/infrastructure/youtube.review-source.ts
export class YoutubeReviewSource implements ReviewSource {   // Adapter + Strategy
  readonly provider = "youtube";
  constructor(private readonly deps: { client: YoutubeClient; filter: RelevanceFilter }) {}
  async collect({ link, cursor }: CollectRequest): Promise<ReviewBatch> { /* ... */ }
}
```

### 6.5 Repository

**Um repository por agregado**, com métodos de intenção (`findDueForCollection`, `saveBatch`), não um CRUD
genérico. **Proibido:** `BaseRepository<T>` genérico.

- O repository recebe `db` (ou a transação) no construtor e devolve **tipos do domínio**, não linhas cruas do Drizzle.
- Use case **não** monta SQL; repository **não** tem regra de negócio.

### 6.6 Factory

- **Module factory** (`createXModule(deps)`): monta o módulo e devolve `{ api, routes, jobs }`.
- **`ReviewSourceFactory`**: devolve a Strategy certa a partir de `provider`.
- Prefira **funções factory** a classes `Factory` quando não houver estado.

### 6.7 Observer (EventBus in-process)

- Eventos são **fatos no passado** (`device.changed`, `review.analyzed`), com payload mínimo (IDs).
- O handler **DEVE ser idempotente**, porque o mesmo evento pode chegar mais de uma vez em catch-up.
- Não há broker externo. Se o processo morrer, o trabalho é retomado pelos **jobs** (o estado fica no banco), não pelo evento.

```ts
export interface EventBus {
  publish<E extends DomainEvent>(event: E): Promise<void>;
  subscribe<T extends DomainEvent["type"]>(type: T, handler: EventHandler<T>): void;
}
```

### 6.8 Pipeline / Chain of Responsibility

**Use para processamentos em etapas.** Cada etapa é pequena, pura quando possível e testável isoladamente.

- **Ingestão:** `normalize → dedupe → relevanceFilter → analyze → aggregate → extractEvidence → purgeRaw`
- **Recomendação:** `applyHardConstraints → normalizeByPercentile → computeUtility → removeDominated → addCollectiveBonus → rank → explain`

```ts
export interface PipelineStep<Ctx> { readonly name: string; run(ctx: Ctx): Ctx | Promise<Ctx>; }
// Pipeline guarda o tempo e o resultado de cada etapa: o motor usa isso para gerar a explicação,
// e a aba Status usa para mostrar a execução.
```

### 6.9 Decorator

**Use para aspectos transversais em volta de adapters**, sem tocar neles:
- `QuotaGuarded<T>`: consome a cota antes de chamar e bloqueia quando esgota.
- `Retrying<T>`: retry com backoff só para 429 e 5xx.
- `Cached<T>`: cache em memória com TTL (ex.: snapshot do catálogo).

```ts
const youtube = new QuotaGuardedYoutubeClient({ inner: new HttpYoutubeClient(cfg), quotas, provider: "youtube" });
```

### 6.10 Command (jobs)

Cada job agendado é um **Command** registrado no scheduler. O scheduler não conhece as regras do job.

```ts
export interface ScheduledJob {
  readonly name: JobName;
  nextDueAt(state: JobState, now: Date): Date;          // política de agendamento
  run(context: JobRunContext): Promise<JobRunResult>;    // respeita context.deadline e context.budget
}
```

### 6.11 Facade

O `index.ts` de cada módulo é a Facade: expõe uma API pequena e estável e esconde a estrutura interna.

### 6.12 Anti-patterns proibidos

- Singleton global com estado, *service locator*, container de DI.
- Hierarquias de herança com mais de 1 nível. Prefira composição.
- Interface com uma única implementação **sem** fronteira de I/O.
- Classe `Utils`/`Helpers` genérica. Funções vão para o módulo do domínio delas.
- `any` (use `unknown` + zod), *non-null assertion* sem justificativa, `enum` do TS (use união de strings + `as const`).
- Funções com efeito colateral escondido (ex.: um `calculate*` que grava no banco).

---

## 7. Configuração e variáveis de ambiente

- **DEVE:** ler o ambiente **somente** em `shared/config/load-config.ts`, validando com zod. O resultado é um
  `AppConfig` imutável e tipado, injetado nos módulos (cada módulo recebe **só a fatia** que usa).
- **DEVE:** falhar no boot (*fail fast*) se faltar segredo ou um valor for inválido, listando **todos** os erros.
- **DEVE:** manter `backend/.env.example` com **todas** as variáveis, comentadas e sem valores reais.
- **Segredos nunca têm default.** Parâmetros não secretos (timeouts, URLs base de APIs públicas) **podem** ter default
  no schema, que fica como fonte única.
- **Parâmetros de negócio** (pesos do motor, meia-vida, k do prior, janelas de retenção) **não** são env: ficam em
  `engine_config`, versionada no banco, ou em constantes nomeadas do domínio com valor inicial.
- **PROIBIDO:** números mágicos. Use constante nomeada com unidade no nome (`MAX_TICK_DURATION_MS`, `MIN_VIDEO_DURATION_SEC`).

```ts
// shared/config/config.schema.ts
export const configSchema = z.object({
  server: z.object({ port: z.coerce.number().int().default(3001), corsOrigin: z.string().url() }),
  database: z.object({ url: z.string().url(), maxConnections: z.coerce.number().int().max(10).default(5) }),
  admin: z.object({ key: z.string().min(24) }),
  cron: z.object({ secret: z.string().min(24) }),
  gemini: z.object({ apiKey: z.string().min(1), model: z.string().default("gemini-2.5-flash"), dailyRequestLimit: z.coerce.number().int().positive() }),
  youtube: z.object({ apiKey: z.string().min(1), dailyUnitLimit: z.coerce.number().int().default(10_000) }),
  mercadoLivre: z.object({ clientId: z.string().optional(), clientSecret: z.string().optional(), baseUrl: z.string().url().default("https://api.mercadolibre.com") }),
  credentials: z.object({ encryptionKey: z.string().length(64) }),
});
export type AppConfig = z.infer<typeof configSchema>;

// shared/config/load-config.ts (ÚNICO arquivo que lê o ambiente)
export function loadConfig(env: Record<string, string | undefined> = Bun.env): AppConfig {
  const result = configSchema.safeParse(mapEnvToConfigShape(env));
  if (!result.success) throw new InvalidConfigError(result.error.issues);
  return Object.freeze(result.data);
}
```

- **Testes** constroem a config com `aConfig().with({ ... }).build()` (Builder), nunca com env real.
- **Front:** só `NEXT_PUBLIC_API_URL` (e afins) via um único `client/src/config.ts`.

---

## 8. Estilo de código e legibilidade

### 8.1 Idioma

| O quê | Idioma |
|---|---|
| Identificadores, arquivos, pastas, tabelas, colunas, rotas | **Inglês** |
| Comentários, JSDoc, logs, mensagens de erro internas, commits, nomes de teste | **Inglês** |
| Texto exibido ao usuário final (UI, mensagens do chat) | **PT-BR**, em arquivos de mensagens (`client/src/messages/pt-BR.json`; backend: `locales/pt-BR/messages.ts`) |
| Vocabulário de domínio usado em matching (palavras-chave de aspecto, termos de review) | **PT-BR**, em `locales/pt-BR/*.ts`, nunca inline na lógica |
| Prompts de LLM | Instruções em **inglês**, com a instrução explícita de que o conteúdo analisado está em PT-BR e de que a resposta voltada ao usuário deve ser em PT-BR. Ficam em arquivos `*.prompt.ts` |
| Documentação de produto (`docs/`) | PT-BR |

### 8.2 Glossário de migração (legado → novo)

| Legado (PT) | Novo (EN) |
|---|---|
| Dispositivo | `Device` |
| fabricante / modelo | `brand` / `model` |
| Caracteristica / CaracteristicaDispositivo | `DeviceSpec` (`key`, `value`) |
| preco | `priceCents` (inteiro, centavos) |
| ComentarioDispositivo | `Review` |
| ComentarioAnalise / ComentarioAspecto | `ReviewAnalysis` / `ReviewAspect` |
| DispositivoAspectoScore | `DeviceAspectStats` |
| DispositivoResumoComentario | `DeviceReviewSummary` |
| PesquisaEvento / HistoricoPesquisa | `SearchEvent` |
| SelecaoPesquisa (origem/status) | `CriterionSelection` (`source: "ui" \| "llm"`, `status: "used" \| "discarded"`) |
| criterios / seletores | `criteria` / `selectors` |
| justificativas | `reasons` |
| matchScore / perfilMatchPercent | `utility` / `opinionFit` |
| bateria / câmera / desempenho / custo-benefício | `battery` / `camera` / `performance` / `valueForMoney` |
| plataforma (comentário) | `provider` |
| referenciaExterna | `externalRef` |

### 8.3 Nomenclatura

- **Arquivos:** `kebab-case` com sufixo de papel: `*.use-case.ts`, `*.repository.ts`, `*.routes.ts`, `*.dto.ts`,
  `*.schema.ts` (Drizzle), `*.builder.ts`, `*.prompt.ts`, `*.job.ts`, `*.test.ts`, `<provider>.<port>.ts`
  (ex.: `youtube.review-source.ts`).
- **Classes/tipos:** `PascalCase`. **Funções/variáveis:** `camelCase`, **verbo** para funções (`collectReviews`),
  **substantivo** para valores. **Constantes:** `UPPER_SNAKE_CASE`.
- **Booleanos:** `is/has/should/can` (`isRelevant`, `hasOwnership`).
- **Unidades no nome:** `durationSec`, `timeoutMs`, `priceCents`, `batteryMah`, `sizeBytes`.
- **Use case:** classe `<Verb><Noun>UseCase` com **um** método público `execute(input)`; input e output tipados.
- **Datas:** `Date` no domínio, ISO-8601 UTC em JSON e banco (`timestamptz`). O relógio vem do `Clock` injetado.
- **Dinheiro:** inteiro em centavos. A formatação é responsabilidade da UI.

### 8.4 Tamanho e forma

- Função: **PREFIRA ≤ 30 linhas**; acima de 50 é sinal de que precisa ser quebrada.
- **≤ 3 parâmetros posicionais** (seção 6.1). Nenhum parâmetro booleano posicional.
- **Aninhamento ≤ 3 níveis.** Use *guard clauses* e *early return*.
- Uma responsabilidade por arquivo. **PREFIRA ≤ 250 linhas** por arquivo.
- Comentário explica o **porquê**, não o **o quê**. Código autoexplicativo vem antes de comentário.
- `readonly` por padrão; mutação só dentro de escopo local.

### 8.5 Erros

Resumo; as regras completas estão na **seção 16.6**.
- Erros **esperados**: subclasses de `AppError` com `code` estável (`DEVICE_NOT_FOUND`, `QUOTA_EXHAUSTED`,
  `INVALID_CRITERIA`), mapeadas para HTTP no `error-handler.ts`.
- Erros inesperados: deixe subir; o handler loga com contexto e responde 500 sem vazar detalhes.
- Formato de erro HTTP: `{ "error": { "code": "DEVICE_NOT_FOUND", "message": "...", "details": {} } }`.
- **PROIBIDO:** `catch` vazio, ou `catch` que só loga e segue sem decisão explícita.

### 8.6 Logging

- Logger injetado (interface `Logger`) e estruturado: `logger.info("reviews.collected", { deviceId, count })`.
- O nome do evento segue `módulo.ação`. **Nunca** logar segredos, tokens ou texto completo de comentário.

---

## 9. HTTP (Hono)

- Cada módulo exporta `routes` (instâncias `Hono`), montadas no composition root com `app.route()`.
- Validação com `zValidator("json" | "query" | "param", schema)`. O handler recebe dados já tipados.
- O handler é **fino**: valida → chama use case → mapeia a saída para o DTO. Sem regra de negócio no handler.
- Rotas: `/v1/<recurso>` em inglês, no plural (`/v1/devices`, `/v1/admin/devices`, `/internal/tick`).
- Admin: middleware `adminAuth(config.admin)`, que compara `X-Admin-Key` em tempo constante.
- Internas: `cronAuth(config.cron)`.
- Respostas paginadas: `{ items, nextCursor }` (paginação por cursor).
- `GET /health` não toca no banco; `GET /v1/status` é a visão completa.

---

## 10. Persistência (Drizzle)

- Cada módulo define suas tabelas em `infrastructure/<module>.schema.ts`. `shared/db/schema.ts` só **re-exporta**,
  para o `drizzle-kit`.
- Tabelas e colunas em `snake_case`, em inglês. PK `uuid` gerada no app (`crypto.randomUUID()`). Timestamps `timestamptz`.
- **Migrations** geradas por `drizzle-kit generate`, revisadas e commitadas. **Nunca** editar uma migration já aplicada.
- Transações: o use case recebe um `UnitOfWork`/`transaction(fn)` quando precisa de atomicidade entre repositories
  do **mesmo** módulo. Atomicidade entre módulos se resolve com eventos e jobs idempotentes.
- **Conexões:** pool ≤ 5 (Aiven free = 20 no total).
- Retenção e limites são feitos por jobs (`retention.sweep`), nunca por `DELETE` espalhado em use cases.

---

## 11. Integrações externas e LLM

- Todo cliente externo: **Adapter** + validação **zod** da resposta + **Decorators** (`QuotaGuarded`, `Retrying`).
- **Timeout obrigatório** em toda chamada externa, vindo da config.
- **Saída de LLM:** pedir JSON, validar com zod e, em caso de falha, tentar **1** vez com uma instrução de correção.
  Persistir só o resultado validado; **não** guardar prompt nem resposta brutos.
- **Lotes:** analisar vários comentários por chamada (tamanho configurável) para economizar cota.
- Cada chamada registra consumo em `quota_usage` (via decorator), que alimenta a aba Status.

---

## 12. Testes (TDD)

### 12.1 Fluxo

1. Escreva o teste do comportamento (**red**).
2. Implemente o mínimo para passar (**green**).
3. Refatore mantendo verde (**refactor**).
4. Rode `bun test` e `bun run typecheck` antes de considerar a feature pronta.

### 12.2 Tipos de teste

| Tipo | Alvo | Dependências | Onde |
|---|---|---|---|
| Unitário | `domain/` (funções puras, builders, value objects) | nenhuma | ao lado do arquivo |
| Caso de uso | `application/` | **fakes in-memory** das portas (`InMemoryReviewRepository`, `FakeSentimentAnalyzer`, `FixedClock`) | ao lado |
| Contrato de adapter | `infrastructure/*-source.ts`, clientes | **fetch injetado** + fixtures JSON reais e anonimizadas (`__fixtures__/`) | ao lado |
| HTTP | rotas | `createApp(testConfig)` + `app.request()` com fakes | `backend/test/http/` |
| Cenários do motor | `recommender` | catálogo fixture + `docs/cenarios/*.json` | `scripts/eval-scenarios.ts` (CI) |
| E2E | fluxos de UI principais | ambiente local | `testsE2E/` (Cypress) |

### 12.3 Regras

- **Testes não acessam rede nem banco real.** Integração com Postgres, quando existir, fica num job separado do CI
  com banco efêmero.
- Nome do teste descreve comportamento: `it("drops dominated devices from the top 3")`.
- Use **Test Data Builders** (`aDevice()`, `aReview()`, `aConfig()`) em vez de objetos literais gigantes.
- O padrão de referência está em `tools/probes/` (fetch injetável + `mockFetcher`).

---

## 13. Front-end (Next.js)

- **App Router**, organizado por feature: `src/features/<feature>/{components,hooks,services,types}`.
  Rotas em `src/app/`. Componentes de UI genéricos em `src/components/ui` (shadcn).
- Dados do servidor: **React Query**, com hooks `useXQuery` / `useXMutation`. Chamadas HTTP só em `services/`
  (um cliente HTTP configurado via `src/config.ts`).
- Estado da conversa do chat: no cliente (hook `useChatSession`). Favoritos: `localStorage`, com fallback seguro.
- Textos da UI: `messages/pt-BR.json`. Componentes e props em inglês.
- Sem regra de negócio no front, que só apresenta o que a API explica (scores, razões, evidências).

---

## 14. Fluxo de git e commits

### 14.1 Regras

- **Conventional Commits**, em inglês: `type(scope): summary` (imperativo, ≤ 72 caracteres).
  - **types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`.
  - **scope:** o nome do módulo (`catalog`, `reviews`, `recommender`…) ou a área (`probes`, `client`, `config`, `db`).
- **Um commit por feature finalizada.** Uma feature é finalizada quando cumpre a *Definition of Done* (14.3).
  Não junte duas features num commit, nem quebre uma feature em commits que deixem o build quebrado.
- O corpo do commit diz **o porquê** e referencia a seção do plano (ex.: `Refs: PLANO_ATUALIZACAO §3.3`).
- Branches: `feat/<module>-<short-desc>`, `fix/...`, `chore/...`. A `main` sempre verde.
- **Nunca** commitar `.env`, relatórios de probe, credenciais ou dumps de dados.

### 14.2 Obrigação do agente de IA ao terminar cada feature

Ao concluir uma feature, o agente **DEVE parar** e entregar ao usuário, nesta ordem:

1. Resumo de 1 a 3 linhas do que mudou.
2. Resultado de `bun test` e `bun run typecheck`.
3. Os **comandos exatos** de commit, listando os arquivos da feature (sem `git add .`):

```bash
git add backend/src/modules/recommender/domain/pareto-filter.ts \
        backend/src/modules/recommender/domain/pareto-filter.test.ts
git commit -m "feat(recommender): drop Pareto-dominated devices before ranking" \
           -m "Removes devices beaten on every weighted aspect at an equal or lower price. Refs: PLANO_ATUALIZACAO §3.4"
```

4. A próxima feature sugerida.

### 14.3 Definition of Done

- [ ] Testes escritos antes ou junto, cobrindo o caminho feliz e os casos de borda relevantes; `bun test` verde.
- [ ] `bun run typecheck` e o lint sem erros.
- [ ] Nenhum `process.env` fora de `shared/config`; novas variáveis adicionadas ao `.env.example` e ao schema.
- [ ] Nenhum import que viole as fronteiras (3.2).
- [ ] Código, comentários e nomes em inglês; textos de usuário em arquivos de mensagens.
- [ ] Nenhuma função com mais de 3 parâmetros posicionais.
- [ ] Docs atualizados se a feature mudou uma decisão (`PLANO_ATUALIZACAO.md` ou este arquivo).
- [ ] Trabalho de fundo em lotes transacionais, idempotente, com checkpoint (16.2–16.3).
- [ ] Erros tipados, descritivos, com `cause` e classificação *retryable* (16.6).
- [ ] Instruções de commit entregues (14.2).

---

## 15. Checklist do agente antes de escrever código

1. Li o `AGENTS.md`, este documento e a seção do `PLANO_ATUALIZACAO.md` da feature?
2. Em qual **módulo** isso mora? Preciso da API de outro módulo ou de um evento?
3. Quais **portas** (interfaces) existem? Preciso criar alguma, ou a fronteira já existe?
4. Qual **pattern** resolve o problema, se algum? (Se a resposta for "nenhum", melhor.)
5. Quais testes escrevo **primeiro**?
6. Há configuração nova? Ela vai no schema de config, em `engine_config` ou numa constante nomeada?
7. Há texto para o usuário? Ele vai no arquivo de mensagens.
8. Isso roda em background? Então: em lotes, com checkpoint, idempotente e com lease (seção 16.2–16.3).
9. Que erros podem acontecer? Quais são *retryable*? Que mensagem descritiva o erro carrega (seção 16.6)?
10. Que consultas novas surgem? Elas têm índice e evitam N+1 (seção 16.5)?
11. Ao terminar: DoD (14.3) e instruções de commit (14.2).

---

## 16. Resiliência, idempotência, banco e exceções

> Contexto: o Render free **dorme** após inatividade e pode reiniciar a qualquer momento (deploy, OOM, manutenção).
> A Aiven free pode ser **desligada** por inatividade. Logo, o sistema é **crash-only**: não existe desligamento
> gracioso garantido, e todo estado necessário para continuar está **no banco**, nunca só em memória.

### 16.1 Princípios

1. **Reinício do zero é o caso normal.** O boot reconstrói tudo a partir do banco com poucas consultas leves.
2. **Nenhuma operação fica pela metade.** Ou um lote inteiro é gravado (dados + checkpoint), ou nada é.
3. **Repetir é seguro.** Toda escrita de fundo pode ser executada 2× sem duplicar nem corromper dados.
4. **Trabalho pequeno e frequente** vale mais que trabalho grande e raro: lotes curtos, *deadline* por tick.
5. **Efeitos externos caros** (LLM, cota do YouTube) são **reservados antes** e **registrados logo depois**.

### 16.2 Jobs em lotes com checkpoint

- **Unidade de trabalho = 1 lote pequeno**, com tamanho em constante nomeada. Exemplos:
  - 1 página de comentários do YouTube (≤ 100);
  - 10–20 comentários por chamada de análise;
  - ≤ 500 linhas por `INSERT` em massa;
  - ≤ 1.000 linhas por `DELETE` de retenção.
- **Cada lote numa transação** que grava **juntos** os dados produzidos **e** o avanço do cursor ou status.
  Se o processo cair no meio, a transação é desfeita e o lote é refeito na próxima execução.

```ts
// application/collect-reviews.use-case.ts (trecho)
for (const link of dueLinks) {
  if (context.deadline.isExpired()) break;              // para limpo, o cursor já está salvo
  const page = await this.deps.source.collect({ link, cursor: link.cursor });  // I/O fora da transação
  await this.deps.transaction(async (tx) => {
    await this.deps.reviews.insertIgnoringDuplicates(tx, page.reviews);       // idempotente (16.3)
    await this.deps.links.advanceCursor(tx, { linkId: link.id, cursor: page.nextCursor, collectedAt: now });
  });
}
```

- **Chamadas externas ficam fora da transação.** Nunca segure transação ou lock durante I/O de rede.
- **Deadline:** cada tick tem um tempo máximo (config). O job verifica antes de cada lote e encerra devolvendo
  `{ status: "partial", processed, remaining }`, que vai para `job_run.summary` e aparece na aba Status.
- **Lease em vez de "processing" eterno.** O legado podia deixar análises presas em `processing` para sempre.
  Para filas em tabela (ex.: análise de comentários), reivindique itens com **lease que expira**:

```sql
UPDATE review
SET    status = 'analyzing', lease_until = now() + interval '5 minutes', attempts = attempts + 1
WHERE  id IN (
  SELECT id FROM review
  WHERE  status = 'pending' OR (status = 'analyzing' AND lease_until < now())
  ORDER  BY created_at
  LIMIT  $batchSize
  FOR UPDATE SKIP LOCKED
)
RETURNING id, content;
```

- **Tentativas e backoff:** `attempts` e `next_attempt_at` (backoff exponencial com teto).
  - Após `MAX_ATTEMPTS`, o item vai para `status = 'failed'` com `error_code` e `error_message` (fila de mortos).
  - Um item com falha permanente **não** bloqueia a fila.
- **Exclusão mútua do tick:** `pg_try_advisory_lock(<job hash>)`. Se não conseguir o lock, sai sem erro, porque
  outra instância ou tick já está rodando.
- **Catch-up no boot:** o servidor sobe e responde `/health` **antes** de qualquer job. O catch-up roda em background,
  depois de um pequeno atraso, e respeita a mesma deadline.

### 16.3 Idempotência

| Escrita | Garantia |
|---|---|
| Review ingerida | `UNIQUE (provider, external_ref)` + `INSERT ... ON CONFLICT DO NOTHING` |
| Aspecto analisado | `UNIQUE (review_id, aspect)` + `ON CONFLICT DO UPDATE` |
| Trecho de evidência | `UNIQUE (review_id, chunk_index)` |
| Acumulador bayesiano | Só soma se a review ainda não foi agregada (abaixo) |
| Rollup diário | `UNIQUE (day, metric, dim)` + recálculo completo do dia (sobrescreve) |
| Feedback | `UNIQUE (session_id, device_id, intent_sig, day)` |
| Execução de job diário | `UNIQUE (job_name, window_start)` em `job_run` |
| Eventos de domínio | Handlers idempotentes (usam as mesmas chaves acima) |

**Agregação incremental sem contagem dupla.** Somar no acumulador e marcar a review como agregada acontece na
**mesma transação**, condicionado à marcação:

```sql
-- dentro da transação
UPDATE review SET aggregated_at = now()
WHERE id = $reviewId AND aggregated_at IS NULL
RETURNING id;                  -- se não retornou linha, já foi agregada: NÃO soma
-- só então:
INSERT INTO device_aspect_stats (...) VALUES (...)
ON CONFLICT (device_id, aspect) DO UPDATE SET sum_w = device_aspect_stats.sum_w + EXCLUDED.sum_w, ...;
```

- **Reconciliação:** um job semanal recalcula os acumuladores do zero a partir de `review_aspect` e corrige eventuais
  desvios. Ele é barato, porque o volume é pequeno.
- **Cota reservada atomicamente** antes da chamada externa:

```sql
UPDATE quota_usage SET used = used + $units
WHERE day = $day AND provider = $provider AND used + $units <= "limit"
RETURNING used;                -- sem linha => QuotaExhaustedError (não chama a API)
```

  Se a chamada falhar **antes** de consumir no provedor (erro de rede na ida), a reserva é devolvida. Se a dúvida
  persistir, é melhor perder 1 unidade do que estourar a cota.
- **HTTP:** `POST /v1/feedback` aceita o `Idempotency-Key` gerado pelo cliente (uuid). `POST /internal/tick` pode ser
  chamado várias vezes: o advisory lock garante uma única execução.

### 16.4 Partida a frio (cold start) e retomada após inatividade

- **Boot mínimo:** `loadConfig()`, criação **preguiçosa** do pool (conecta no primeiro uso) e registro das rotas.
  Nada de recalcular percentis, carregar modelo ou varrer tabelas no boot.
- **Estado derivado persistido:** percentis (`catalog_stats`), `engine_config` ativa e snapshot do catálogo são lidos
  com **1 consulta cada** e ficam em cache em memória com TTL (Decorator `Cached`). Se o cache se perder no
  reinício, só custa uma consulta.
- **Banco desligado ou acordando:** a conexão inicial usa retry com backoff curto (ex.: 3 tentativas). Se continuar
  falhando, `/v1/status` e as rotas respondem `503` com `code: "DATABASE_UNAVAILABLE"` e uma mensagem clara.
  O processo **não** cai.
- **Pool:** `max ≤ 5`, `idleTimeout` curto (ex.: 30 s). O plano free tem só 20 conexões, e um processo dormindo não
  deve segurar conexões.
- **Retomada de jobs:** a próxima execução é decidida por `job.next_due_at` e pelos cursores no banco, nunca por
  `setInterval` em memória. Um job que estava atrasado durante o sono roda **uma vez**, sem tentar compensar cada
  ciclo perdido.

### 16.5 Otimização do banco (Postgres, 1 GB)

**Consultas:**
- **Sem N+1.** O legado buscava `dispositivo` por modelo dentro de um loop. O padrão novo resolve em lote:
  `WHERE id = ANY($ids)` ou `WHERE model = ANY($models)`, e depois monta um `Map`.
- **Inserção em massa** em lotes de ≤ 500 linhas, numa única instrução.
- **Paginação por cursor** (keyset: `WHERE (created_at, id) < ($c, $id) ORDER BY created_at DESC, id DESC`), nunca `OFFSET` alto.
- **Selecione só as colunas usadas.** `content` (texto bruto) nunca entra em listagens.

**Índices** (crie só os que tiverem consulta correspondente; documente a consulta ao lado do índice):

| Tabela | Índice | Consulta atendida |
|---|---|---|
| `review` | `UNIQUE (provider, external_ref)` | dedupe |
| `review` | parcial `(created_at) WHERE status IN ('pending','analyzing')` | fila de análise |
| `review` | parcial `(device_id) WHERE aggregated_at IS NULL` | agregação pendente |
| `review_source_link` | `(next_due_at)` | próximo a coletar |
| `device_aspect_stats` | PK `(device_id, aspect)` | scores por aparelho |
| `evidence_snippet` | `(device_id, aspect)` + HNSW em `embedding` | busca de evidência |
| `search_event`, `feedback_event`, `job_run` | **BRIN** `(created_at)` | retenção e rollups (tabelas append-only) |
| `collective_score` | PK `(device_id, intent_sig)` | bônus coletivo |

**Armazenamento:**
- Tipos enxutos: `smallint` para notas (0–5, 1–5), `real` para scores, `integer` para centavos, `text` com limite
  validado no app.
- **Sem blobs de debug:** nada de prompt ou resposta brutos de LLM (o legado guardava os dois por comentário).
- Embeddings: prefira `halfvec` (pgvector ≥ 0.7), que ocupa metade do espaço de `vector`, mais um limite de trechos
  por (aparelho, aspecto).
- **Retenção em lotes:** `DELETE ... WHERE id IN (SELECT id ... LIMIT 1000)` repetido até a deadline. Isso evita lock
  longo e inchaço; o autovacuum cuida do resto.
- **Monitoramento:** `pg_database_size()` e `pg_total_relation_size()` por tabela entram no status. Acima de 70% do
  limite, as janelas de retenção encolhem automaticamente.

### 16.6 Tratamento de exceções

**Hierarquia (em `shared/errors`):**

```ts
export abstract class AppError extends Error {
  abstract readonly code: string;          // estável, UPPER_SNAKE_CASE, usado pelo front e pelo status
  abstract readonly httpStatus: number;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;
  constructor(message: string, options: { context?: Record<string, unknown>; cause?: unknown; retryable?: boolean } = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.context = options.context ?? {};
    this.retryable = options.retryable ?? false;
  }
}

export class ValidationError extends AppError { code = "VALIDATION_FAILED"; httpStatus = 400; }
export class NotFoundError extends AppError { code = "NOT_FOUND"; httpStatus = 404; }
export class ConflictError extends AppError { code = "CONFLICT"; httpStatus = 409; }
export class QuotaExhaustedError extends AppError { code = "QUOTA_EXHAUSTED"; httpStatus = 429; }
export class DatabaseUnavailableError extends AppError {
  code = "DATABASE_UNAVAILABLE"; httpStatus = 503;
  constructor(message: string, options: { cause?: unknown } = {}) { super(message, { ...options, retryable: true }); }
}

export class ExternalServiceError extends AppError {
  code = "EXTERNAL_SERVICE_FAILED";
  httpStatus = 502;
  constructor(input: { provider: string; operation: string; status?: number; retryable: boolean; cause?: unknown; detail?: string }) {
    super(
      `${input.provider} ${input.operation} failed` +
        (input.status ? ` with HTTP ${input.status}` : "") +
        (input.detail ? `: ${input.detail}` : ""),
      {
        context: { provider: input.provider, operation: input.operation, status: input.status },
        cause: input.cause,
        retryable: input.retryable,
      },
    );
  }
}
```

**Onde usar `try/catch`:** só em **bordas**, onde existe uma decisão a tomar.

| Borda | O que faz no `catch` |
|---|---|
| **Adapter** (YouTube, ML, Gemini, DB) | **Traduz** o erro de terceiro num `AppError` tipado, com `cause`, `provider`, `operation`, `status` e `retryable` (429/5xx/timeout ⇒ `true`; 400/401/403/404 ⇒ `false`) |
| **Executor de lote** (job runner) | Por item ou lote: erro `retryable` agenda nova tentativa com backoff; não-`retryable` vai para `failed`, com `error_code` e `error_message`. **O job continua** com o próximo item |
| **Executor de tick** | Captura o erro do job inteiro, grava `job_run.status = 'failed'` com o resumo e libera o lock no `finally` |
| **HTTP error handler** (`app.onError`) | `AppError` ⇒ status e corpo padronizados; qualquer outro erro ⇒ 500 genérico, com log completo |
| **Parse de LLM / JSON externo** | `zod.safeParse`; em falha ⇒ `ValidationError` descrevendo o campo e o motivo, com 1 retry de correção (seção 11) |

**Mensagens descritivas.** Toda mensagem responde: **o que** falhou, **em qual entidade**, **por quê** e, quando
útil, **o que fazer**.

```ts
// ❌ throw new Error("erro");                     ❌ throw new Error("Failed");
// ✅
throw new NotFoundError(`Device ${deviceId} not found while linking YouTube video ${videoId}`, { context: { deviceId, videoId } });
// ✅
throw new ExternalServiceError({
  provider: "youtube", operation: "commentThreads.list", status: 403, retryable: false,
  detail: `comments are disabled for video ${videoId}; link will be skipped`, cause: err,
});
// ✅
throw new InvalidConfigError(issues); // "Invalid configuration: GEMINI_API_KEY is required; DATABASE_URL must be a URL"
```

**Regras:**
- **Sempre** preserve a causa original (`{ cause }`). Nunca perca o stack trace do erro de baixo.
- **Logue uma vez só**, na borda que decide (job runner / error handler), com `code`, `context` e `cause`.
  Não logue e relance em cada camada.
- **`finally`** para liberar recursos (lock, lease, timer), nunca para lógica de negócio.
- **Nunca** exponha stack, SQL ou segredos na resposta HTTP. O `context` enviado ao cliente passa por uma lista branca.
- O erro que chega à aba Status é **amigável e acionável** ("cota do YouTube esgotada hoje; próxima coleta às 04:00").
  O código (`QUOTA_EXHAUSTED`) é o que o front traduz para PT-BR.
- **Teste os caminhos de erro:** todo adapter tem teste para 403, 429, timeout e JSON inválido; todo job tem teste de
  "cai no meio do lote ⇒ nada parcial gravado" e de "rodar 2× ⇒ mesmo resultado".
