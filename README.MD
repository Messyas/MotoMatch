# PhoneMatch (v2)

> Sistema demonstrativo de recomendação de smartphones multicritério (MAUT) e análise de aspectos com inteligência artificial, projetado para rodar 100% em infraestrutura gratuita com alta resiliência e explicabilidade.
>
> O código legado do projeto MotoMatch (focado exclusivamente em Motorola) está preservado na tag git [**`v1-legado`**](https://github.com/Messyas/MotoMatch/tree/v1-legado).

---

## 📖 Documentação do Projeto

- **[docs/PLANO_ATUALIZACAO.md](docs/PLANO_ATUALIZACAO.md):** Especificação completa de escopo, design do motor de recomendação, fontes de dados, retenção e roteiro em fases.
- **[docs/ARQUITETURA.md](docs/ARQUITETURA.md):** Guia arquitetural mandatório (monólito modular, convenções de código, tratamento de erros, padrões de resiliência e checklist para agentes).
- **[AGENTS.md](AGENTS.md):** Resumo executivo de diretrizes para agentes de IA e desenvolvedores.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Runtime** | [Bun](https://bun.sh/) (≥ 1.2) |
| **Backend** | Monólito modular com [Hono](https://hono.dev/) |
| **Banco de Dados** | PostgreSQL com extensão `pgvector` |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) com migrations SQL versionadas |
| **Validação** | [Zod](https://zod.dev/) na borda e na configuração |
| **LLM** | Google Gemini (extração de critérios e análise semântica de aspectos) |
| **Frontend** | [Next.js](https://nextjs.org/) (App Router) + React Query + Tailwind CSS |
| **Testes** | `bun test` com TDD estrito e Test Data Builders |

---

## 🚀 Como Executar

### 1. Probes de validação de fontes (Fase 0)
```bash
cd tools/probes
bun install
bun test               # 67 testes unitários offline
bun run typecheck
```

### 2. Backend (PhoneMatch API)
```bash
cd backend
bun install
bun test
bun run typecheck
bun run dev
```

---

## 📜 Licença

Distribuído sob licença MIT. Consulte os arquivos de documentação para diretrizes de contribuição.
