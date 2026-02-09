# Moto Match - Projeto WebAcademy

**Universidade Federal do Amazonas | Curso de Desenvolvimento Web FullStack**

Um sistema inteligente de recomendação de smartphones baseado em análise de sentimentos e perfil de uso.

---

## Equipe de Desenvolvimento

| Nome                             | Função                |
| :------------------------------- | :-------------------- |
| **Cleicy Priscilla Aragão dos Santos** | FullStack Developer   |
| **Josival Salvador Monteiro Júnior** | FullStack Developer   |
| **Messyas Gois França** | FullStack Developer   |
| **Vanderson Cardoso Rodrigues** | DevOps / Tester       |

---

## Índice

* [Sobre o Projeto](#-sobre-o-projeto)
* [Setup e Execução do Ambiente Local](#-setup-e-execução-do-ambiente-local)
* [Escopo e Funcionalidades](#-escopo-e-funcionalidades)

---

## Sobre o Projeto

**QualCel AI** é uma plataforma que utiliza inteligência artificial para ajudar consumidores a escolherem o celular ideal. O sistema coleta e analisa avaliações reais de usuários de grandes e-commerces (Amazon, Magazine Luiza, etc.) para extrair sentimentos e identificar os pontos fortes e fracos de cada modelo da Motorola.

Através de um quiz interativo, o usuário informa suas prioridades (bateria, câmera, custo-benefício, desempenho) e recebe recomendações personalizadas, simplificando o complexo processo de decisão de compra de um smartphone.

---

## Setup e Execução do Ambiente Local

### Pré-requisitos
* **[Docker](https://www.docker.com/get-started)**
* **[Docker Compose](https://docs.docker.com/compose/install/)**

### Opções de Banco de Dados

O projeto permite rodar o backend de duas formas:

- **Banco Remoto:** conecta a um banco externo já existente. Necessário solicitar o DB URL (Prisma `DATABASE_URL`) ao responsável do banco (a equipe do projeto).
- **Banco Local:** usa MySQL dentro do `docker-compose.local.yml` e aplica automaticamente as migrations (recomendado para desenvolvimento isolado).

> OBS: Não rode migrations em banco remoto sem autorização. `migrate deploy` altera o schema do banco.

> Todas as execuções abaixo são **no modo de desenvolvimento (dev)**.

---

### Arquivos importantes

- `docker-compose.local.yml` → compose para **local** (MySQL + phpMyAdmin) usando `backend/Dockerfile.local`.
- `docker-compose.yml` → compose para **remoto**, usando `backend/Dockerfile` sem migrations automáticas.
- `backend/Dockerfile` → antigo, **não** aplica migrations.
- `backend/Dockerfile.local` → novo, aplica `npx prisma migrate deploy` antes de iniciar o backend.
- `.env.example` → exemplo de configuração do backend, contendo placeholders para Banco Local e Remoto.

---

### 1) Banco Local (MySQL + phpMyAdmin)

1. Configure o `.env` do backend:
```env
DATABASE_URL="mysql://appuser:apppass@db:3306/appdb"
```

Suba os containers:
```bash
# primeira execução ou após alteração de dependências
docker compose -f docker-compose.local.yml up --build

# execuções seguintes
docker compose -f docker-compose.local.yml up
```

Acesse:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- phpMyAdmin: http://localhost:8080 (usuário: `root`, senha: `rootpass`)

---

### 2) Banco Remoto

1. Solicite o DB URL (Prisma `DATABASE_URL`) ao responsável do banco:
```env
DATABASE_URL=
```

2. Suba o compose:
```bash
# primeira execução ou após alteração de dependências
docker compose -f docker-compose.yml up --build

# execuções seguintes
docker compose -f docker-compose.yml up
```

---

### Dicas rápidas

- **Local:** `Dockerfile.local` roda migrations automaticamente.
- **Remoto:** `Dockerfile` não roda migrations automáticas.
- Use `docker-compose.local.yml` para local e `docker-compose.yml` para remoto.
- Porta do MySQL local mapeada: `3307:3306` — verifique conflitos no host.

---

### Checklist rápido

| Ambiente | Passos essenciais |
|----------|-----------------|
| Local    | 1. Configurar `DATABASE_URL` no `.env` <br> 2. `docker compose -f docker-compose.local.yml up --build` <br> 3. Acessar Frontend/Backend/phpMyAdmin |
| Remoto   | 1. Solicitar DB URL <br> 2. Configurar `.env` <br> 3. `docker compose up --build` <br>|

---

### Parando a execução

Para parar os containers em execução no terminal, pressione `Ctrl + C`.

Para parar e remover containers:

```bash
# Banco Local
docker compose -f docker-compose.local.yml down

# Banco Remoto
docker compose -f docker-compose.yml down
