// //use para rodar npx ts-node prisma/seedUsers.ts

// import { PrismaClient } from "@prisma/client";
// import { fakerPT_BR as faker } from "@faker-js/faker";

// const prisma = new PrismaClient();

// async function main() {
//   // Distribuição progressiva (crescimento por mês)
//   const distribution = [5, 10, 18, 27, 25, 30, 40];
//   const startMonth = new Date();
//   startMonth.setMonth(startMonth.getMonth() - (distribution.length - 1));

//   let totalCreated = 0;

//   for (let i = 0; i < distribution.length; i++) {
//     const usersThisMonth = distribution[i];
//     const currentMonth = new Date(startMonth);
//     currentMonth.setMonth(startMonth.getMonth() + i);

//     console.log(
//       `Criando ${usersThisMonth} usuários para ${currentMonth.toLocaleString(
//         "pt-BR",
//         { month: "long" }
//       )}`
//     );

//     for (let j = 0; j < usersThisMonth; j++) {
//       const createdAt = faker.date.between({
//         from: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
//         to: new Date(
//           currentMonth.getFullYear(),
//           currentMonth.getMonth() + 1,
//           0
//         ),
//       });

//       const username = faker.internet.username().toLowerCase();
//       const password = "Senha@123";
//       const tipo = "1";
//       const nome = faker.person.fullName();
//       const nascimento = faker.date.birthdate({
//         min: 1970,
//         max: 2005,
//         mode: "year",
//       });
//       const email = faker.internet.email({
//         firstName: nome.split(" ")[0],
//         lastName: nome.split(" ")[1] || "",
//       });

//       // Gera celular no formato 119########
//       const celular = faker.helpers.replaceSymbols("119########");

//       const user = await prisma.usuario.create({
//         data: {
//           username,
//           nome,
//           nascimento,
//           email,
//           celular,
//           password,
//           tipo,
//         },
//       });

//       await prisma.usuario.update({
//         where: { idUsuario: user.idUsuario },
//         data: { createdAt },
//       });

//       totalCreated++;
//     }
//   }

//   console.log(
//     `${totalCreated} usuários criados com crescimento progressivo até o mês atual.`
//   );
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
