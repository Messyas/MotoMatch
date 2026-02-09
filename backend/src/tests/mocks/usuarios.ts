import { Usuario } from "@prisma/client";

// Adicionando idUsuario para corrigir o erro de omissão
export const mockUsers: Usuario[] = [
  {
    idUsuario: "0d5b3397-8697-42fa-8b5f-c65efb6b653e",
    username: "luciano.ltamm",
    nome: "Eddie Borer",
    nascimento: new Date("2000-03-02"),
    email: "bethany.bosco14@gmail.com",
    emailVerificado: true,
    verificadoEm: new Date("2023-01-05T00:00:00.000Z"),
    celular: "5592977777777",
    password: "12345Ab@",
    tipo: "0",
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
  },
  {
    idUsuario: "422496bb-b726-4351-bb8b-5b5faadb425d",
    username: "brielle_bergnaum",
    nome: "Olive Rohan",
    nascimento: new Date("2001-01-23"),
    email: "graciela_kunde@yahoo.com",
    emailVerificado: false,
    verificadoEm: null,
    celular: "5592977777779",
    password: "12345Ab@",
    tipo: "1",
    createdAt: new Date("2023-01-02T00:00:00.000Z"),
  },
];

export const newUserMock: Usuario = {
  idUsuario: "novo-id",  // Agora inclui idUsuario
  username: "novouser",
  nome: "Novo Usuário",
  nascimento: new Date("2000-01-01"),
  email: "novo@teste.com",
  emailVerificado: false,
  verificadoEm: null,
  celular: "5592929999999",
  password: "12345Ab@",
  tipo: "1",
  createdAt: new Date(),
};

export const anotherUserMock: Usuario = {
  idUsuario: "novo-id-erro",  // Também inclui idUsuario aqui
  username: "usuario.unico.erro",
  nome: "Usuário Teste Erro",
  nascimento: new Date("1999-05-05"),
  email: "erro@teste.com",
  emailVerificado: false,
  verificadoEm: null,
  celular: "5592988888884",
  password: "Abc1235@",
  tipo: "1",
  createdAt: new Date(),
};

// Para os testes de autenticação, também inclui idUsuario
export const newUserMockAuth: Usuario = {
  idUsuario: "novo-id-auth",
  username: "novouser",
  nome: "Novo Usuário",
  nascimento: new Date("2000-01-01"),
  email: "novo@teste.com",
  emailVerificado: false,
  verificadoEm: null,
  celular: "5592959999999",
  password: "12345Ab@",
  tipo: "1",
  createdAt: new Date(),
};

export const anotherUserMockAuth: Usuario = {
  idUsuario: "novo-id-auth-erro",
  username: "usuario_unico_erro",
  nome: "Usuário Teste Erro",
  nascimento: new Date("1999-05-05"),
  email: "erro@teste.com",
  emailVerificado: false,
  verificadoEm: null,
  celular: "5592988188888",
  password: "Abc125@",
  tipo: "1",
  createdAt: new Date(),
};
