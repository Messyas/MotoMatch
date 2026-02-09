# Qual-Cel-AI

Projeto desenvolvido em [Next.js](https://nextjs.org) com suporte a **App Router** e **shadcn/ui** para a construção de componentes reutilizáveis.

---

## Como rodar o projeto

Clone o repositório e instale as dependências:

```bash
npm install
# ou
yarn install
# ou
pnpm install
# ou
bun install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador para visualizar a aplicação.

---

## Estrutura do Projeto

```
qual-cel-ai/
├── public/              # Arquivos estáticos (imagens, ícones, PDFs, etc.)
├── src/
│   ├── app/             # Estrutura principal (App Router)
│   │   ├── services/    # Serviços e chamadas de API
│   │   ├── types/       # Tipagens TypeScript globais
│   │   ├── layout.tsx   # Layout base da aplicação
│   │   ├── page.tsx     # Página inicial (/)
│   │   └── globals.css  # Estilos globais
│   │
│   ├── components/
│   │   └── ui/          # Componentes de interface (via shadcn/ui)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── form.tsx
│   │       ├── input.tsx
│   │       └── label.tsx
│   │
│   └── lib/             # Funções utilitárias
│       └── utils.ts
│
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
└── ...
```

---

## shadcn/ui

O **shadcn/ui** não funciona como uma biblioteca comum:  
ele copia os componentes direto para `src/components/ui/`, dando controle total para modificar estilos e comportamento.

### Adicionar um novo componente

```bash
npx shadcn@latest add button
```

Isso criará (ou atualizará) o arquivo em `src/components/ui/button.tsx`.

### Modificar um componente

Basta abrir o arquivo em `src/components/ui/` e editar.  
Exemplo de uso:

```tsx
import { Button } from "@/components/ui/button"

export default function Home() {
  return <Button variant="default">Clique aqui</Button>
}
```

---

## Resumo

- **Páginas e layouts** → `src/app`  
- **Componentes reutilizáveis (UI)** → `src/components/ui`  
- **Regras de negócio / API** → `src/app/services`  
- **Helpers** → `src/lib`  
- **Estilos globais** → `src/app/globals.css`  
- **Arquivos estáticos** → `public/`  

---

## Deploy

A forma mais simples de deploy é usando a [Vercel](https://vercel.com), criadora do Next.js.

