import swaggerAutogen from "swagger-autogen";
import dotenv from "dotenv";
import { Usuario } from "@prisma/client";

dotenv.config();

const doc = {
  info: { title: "Moto Match", description: "Documentação da API" },
  host: `${process.env.HOST}:${process.env.PORT}`,
  definitions: {
    CreateUsuarioDTO: {
      username: "usuario001",
      nome: "Joao da Silva Pereira",
      nascimento: "2000-01-10",
      email: "joao@motomatch.com",
      celular: "5592988888888",
    },
    UpdateUsuarioDTO: {
      username: "usuario001",
      nome: "Joao da Silva Pereira",
      email: "joao@motomatch.com",
      celular: "5592988888888",
    },
    User: {
      id: "8a2053de-5d92-4c43-97c0-c9b2b0d56703",
      username: "usuario001",
      nome: "Joao da Silva Pereira",
      nascimento: "2000-01-10",
      email: "joao@motomatch.com",
      celular: "5592988888888",
    },
  },
};

const outputFile = "./swagger-output.json";
const routes = ["./src/router/index.ts"];

swaggerAutogen()(outputFile, routes, doc);
