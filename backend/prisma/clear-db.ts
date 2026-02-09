// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// async function main() {
//   console.log("💣 Apagando TODOS os dados do banco...");

//   // Ordem é importante por causa das FKs (relacionamentos)
//   await prisma.comentarioAspecto.deleteMany({});
//   await prisma.comentarioAnalise.deleteMany({});
//   await prisma.comentarioDispositivo.deleteMany({});
//   await prisma.dispositivoAspectoScore.deleteMany({});
//   await prisma.caracteristicaDispositivo.deleteMany({});
//   await prisma.caracteristica.deleteMany({});
//   await prisma.favorito.deleteMany({});
//   await prisma.resultadoPesquisa.deleteMany({});
//   await prisma.historicoPesquisa.deleteMany({});
//   await prisma.selecaoPesquisa.deleteMany({});
//   await prisma.pesquisaEvento.deleteMany({});
//   await prisma.sessaoAnonima.deleteMany({});
//   await prisma.emailVerificationToken.deleteMany({});
//   await prisma.contaOAuth.deleteMany({});
//   await prisma.dispositivo.deleteMany({});
//   await prisma.usuario.deleteMany({});

//   console.log("✅ Banco completamente limpo.");
// }

// main()
//   .catch((e) => {
//     console.error("Erro ao apagar dados:", e);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
