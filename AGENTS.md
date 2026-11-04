# AGENTS.md — PhoneMatch

Instruções para agentes de IA (e humanos) que trabalham neste repositório.

## Leia antes de codar
1. `docs/ARQUITETURA.md`: **como** escrever código (obrigatório, regras "DEVE").
2. `docs/PLANO_ATUALIZACAO.md`: **o que** construir e em que fase.
3. O código legado (MotoMatch) está na tag `v1-legado`. Use-o só como referência de regras de negócio, sem copiar estrutura nem nomes.

## Regras inegociáveis (resumo)
- Monólito modular: módulos em `backend/src/modules/*`. Importe outro módulo **só** pelo `index.ts` dele.
- Código, nomes, comentários, logs e commits em **inglês**. PT-BR só em arquivos de mensagens/UI e em `locales/pt-BR`.
- `process.env`/`Bun.env` **somente** em `backend/src/shared/config/load-config.ts` (validado com zod). Nada hardcoded: use constantes nomeadas, config ou `engine_config`.
- No máximo 3 parâmetros posicionais. Acima disso, objeto de parâmetros; Builder para construção complexa.
- Patterns explícitos (Strategy, Adapter, Repository, Factory, Builder, Pipeline, Decorator, Observer, Command, Facade), sem overengineering: interface só com fronteira de I/O ou ≥ 2 implementações.
- DI manual pelo construtor, montada em `backend/src/app.ts`. Sem singletons globais.
- Trabalho de fundo: lotes pequenos e transacionais, checkpoint no banco, idempotente, lease com expiração. O processo pode morrer a qualquer momento.
- Exceções: `try/catch` só nas bordas (adapter, executor de lote, error handler), com erros tipados (`AppError`), descritivos, com `cause` e `retryable`.
- TDD com `bun test`. Testes não acessam rede nem banco real (fetch injetável, fakes in-memory, builders).

## Comandos
```bash
# backend (quando existir)
cd backend && bun install && bun test && bun run typecheck
# probes da Fase 0
cd tools/probes && bun install && bun test
```

## Ao terminar cada feature
Pare e entregue: (1) resumo curto, (2) resultado dos testes e do typecheck, (3) **comandos exatos de commit**
(Conventional Commits em inglês, um commit por feature, `git add` com arquivos explícitos), (4) próxima feature sugerida.
Detalhes em `docs/ARQUITETURA.md` §14.
