# Backend - Qual-Cel-AI

Este é o backend do projeto **Qual-Cel-AI**, responsável por gerenciar os recursos e servir a API REST.  
Ele foi desenvolvido em **Node.js** com **TypeScript**, utilizando **Prisma ORM** para acesso ao banco de dados.

---

## Como rodar o projeto

Clone o repositório e instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` na raiz do projeto com as variáveis necessárias (como conexão ao banco).  

Inicie o servidor em modo desenvolvimento:

```bash
npm run dev
```

Ou em modo produção:

```bash
npm run build
npm start
```

Por padrão, o backend roda em:

```
http://localhost:3001
```

### Serviço externo de recomendação

O fluxo de matching agora delega o cálculo de scores para um microserviço FastAPI (em `recommendationService/`).  
Defina as variáveis abaixo no `.env` para apontar para a instância correta:

- `RECOMMENDATION_SERVICE_URL` → endpoint `POST /ml/score-dispositivos` do serviço Python  
- `RECOMMENDATION_SERVICE_TIMEOUT` → timeout (ms) para a chamada HTTP

Durante o desenvolvimento local, basta subir o serviço com:

```bash
uvicorn recommendationService.main:app --reload --port 8000
```

O backend continuará usando o algoritmo heurístico interno caso o microserviço esteja indisponível.

#### Verificando os logs

Para acompanhar a inicialização ou debugar chamadas entre os serviços execute:

```bash
docker compose logs -f recommendation backend
# ou, no ambiente local de desenvolvimento
docker compose -f docker-compose.local.yml logs -f recommendation backend
```

O `recommendation` só é considerado pronto quando o healthcheck HTTP em `http://recommendation:8000/` responde; em seguida o backend sobe e, por fim, o frontend.

#### Como o backend conversa com o serviço Python

1. **Coleta de candidatos** – `findMatchingDispositivos` (`backend/src/resources/dispositivo/dispositivo.service.ts`) busca todos os dispositivos via Prisma e lê as notas de aspecto em `dispositivoAspectoScore`.
2. **Montagem do payload** – `buildDevicePayloadForRecommendationService` serializa as características, preço e `aspect_scores` esperados pelo FastAPI.
3. **Chamada HTTP** – `callRecommendationMicroservice` envia `POST /ml/score-dispositivos` para a URL definida em `RECOMMENDATION_SERVICE_URL` e espera um JSON com `scores`.
4. **Tratamento da resposta** – `mapScoresToRecommendations` casa cada `id` retornado com o dispositivo original, anexando `matchScore`, `matchExplanation` etc.; depois `anexarHistoricoRecomendacoes` salva o histórico quando há usuário logado.
5. **Fluxo conversacional** – `orquestrarPesquisaConversacional` gera filtros (IA + heurísticas) e chama `findMatchingDispositivos`; se a requisição ao microserviço falhar, retorna `acao: "PERGUNTAR"` para o front.

Se precisar testar manualmente a comunicação: faça `curl http://localhost:8000/` para validar o FastAPI e, em seguida, `POST http://localhost:3001/v1/dispositivos/pesquisa` com filtros estruturados. Erros na integração aparecem nos logs com o prefixo `[RecommendationService]`.

---

## Estrutura do Projeto

```
backend/
├── prisma/                     # Configurações do Prisma ORM
│   ├── migrations/             # Histórico de migrações do banco
│   │   └── ..._create_dispositivo_table/
│   └── schema.prisma           # Definição do modelo de dados
│
├── src/
│   ├── middlewares/            # Middlewares globais
│   │   └── validate.ts
│   │
│   ├── resources/              # Recursos da aplicação (DDD style)
│   │   └── dispositivo/        # Módulo Dispositivo
│   │       ├── dispositivo.controller.ts  # Lógica dos endpoints
│   │       ├── dispositivo.errors.ts      # Erros customizados
│   │       ├── dispositivo.router.ts      # Definição de rotas
│   │       ├── dispositivo.service.ts     # Regras de negócio
│   │       ├── dispositivo.shema.ts       # Validação de schemas
│   │       └── dispositivo.types.ts       # Tipagens TS
│   │
│   ├── router/                 # Roteadores principais
│   │   ├── index.ts            # Roteador raiz
│   │   └── v1Router.ts         # Agrupamento de rotas v1
│   │
│   └── utils/                  # Funções utilitárias
│       ├── validateEnv.ts      # Validação de variáveis de ambiente
│       ├── swagger.ts          # Configuração Swagger
│       ├── swagger-output.json # Especificação da API
│       └── index.ts
│
├── .env                        # Variáveis de ambiente
├── Dockerfile                  # Configuração para containerização
├── package.json
├── tsconfig.json
└── README.md
```

---

## Rotas da API

A API segue o padrão REST e é versionada.  
A versão atual está disponível em:

```
http://localhost:3001/v1
```

### Recursos disponíveis:

- **Dispositivo**
  - `GET /v1/dispositivos` → Lista dispositivos
  - `POST /v1/dispositivos` → Cria um novo dispositivo
  - `GET /v1/dispositivos/:id` → Busca um dispositivo específico
  - `PUT /v1/dispositivos/:id` → Atualiza um dispositivo
  - `DELETE /v1/dispositivos/:id` → Remove um dispositivo  


---

## Banco de Dados

O projeto utiliza **Prisma ORM** como camada de acesso a dados.  

- O schema está definido em `prisma/schema.prisma`.  
- Migrações ficam em `prisma/migrations/`.  
- O banco está hospedado na **Aiven**, uma plataforma de banco de dados gerenciado.  

Para aplicar as migrações localmente:

```bash
npx prisma migrate dev
```

Para visualizar os dados:

```bash
npx prisma studio
```

---

## Documentação da API

A documentação da API é gerada automaticamente com **Swagger**.  
Após rodar o projeto, acesse:

```
http://localhost:3001/api
```

---
