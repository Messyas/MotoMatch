// import { PrismaClient } from "@prisma/client";
// // para rodar: npx tsx prisma/clearHistory.ts
// const prisma = new PrismaClient();

// async function main() {
//   console.log("Limpando histórico de pesquisa e dados relacionados");

//   // Ordem de deleção respeitando dependências
//   await prisma.$transaction([
//     prisma.resultadoPesquisa.deleteMany(),
//     prisma.favorito.deleteMany(),
//     prisma.historicoPesquisa.deleteMany(),
//     prisma.selecaoPesquisa.deleteMany(),
//     prisma.pesquisaEvento.deleteMany(),
//     prisma.sessaoAnonima.deleteMany(),
//   ]);

//   console.log("Histórico de pesquisa limpo!");
// }

// main()
//   .catch((e) => {
//     console.error(e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
