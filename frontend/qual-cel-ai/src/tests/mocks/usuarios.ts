import { UserCadastro, UserCadastroAdm } from "@/types/user";

export const mockUsers: UserCadastro[] = [
  {
    // idUsuario: "0d5b3397-8697-42fa-8b5f-c65efb6b653e",
    username: "luciano.stamm",
    nome: "Eddie Borer",
    nascimento: "2000-03-02",
    email: "bethany.bosco14@gmail.com",
    celular: "5592977777777",
    password: "12345Ab@",
  },
  {
    // idUsuario: "422496bb-b726-4351-bb8b-5b5faadb425d",
    username: "brielle_bergnaum",
    nome: "Olive Rohan",
    nascimento: "2001-01-23",
    email: "graciela_kunde@yahoo.com",
    celular: "5592977777779",
    password: "12345Ab@",
    // tipo: "0",
  },
];

export const mockUsersAdm: UserCadastroAdm[] = [
  {
    idUsuario: "0d5b3397-8a97-42fa-8b5f-c65efb6b653e",
    username: "luciano.stamm",
    nome: "Eddie Borer",
    nascimento: "2000-03-02",
    email: "bethany.bosco14@gmail.com",
    celular: "5592977777377",
    password: "12345Ab@",
    tipo: "0",
  },

  {
    idUsuario: "42x496bb-b726-4351-bb8b-5b5faadb425d",
    username: "brielle_bergnaum",
    nome: "Olive Rohan",
    nascimento: "2001-01-23",
    email: "graciela_kunde@yahoo.com",
    celular: "5592977717779",
    password: "12345Ab@",
    tipo: "1",
  },
  {
    idUsuario: "422496bb-b726-4651-bb8b-5b5fxadb425d",
    username: "maria",
    nome: "Maria Rosa",
    nascimento: "2001-01-23",
    email: "maria@yahoo.com",
    celular: "5592927777779",
    password: "12345Ab@",
    tipo: "1",
  },
];

export const newUserMock = {
  username: "novoUser",
  nome: "Novo Usuário",
  nascimento: "2000-01-01",
  email: "novo@teste.com",
  celular: "5592929999999",
  password: "12345Ab@",
  tipo: "1",
};

// Novo usuário para testes de fluxo de erro ou criação única
export const anotherUserMock = {
  username: "usuarioUnicoErro",
  nome: "Usuário Teste Erro",
  nascimento: "1999-05-05",
  email: "erro@teste.com",
  celular: "5592988888888",
  password: "Abc125@",
  tipo: "1",
};

export const newUserMockAuth = {
  username: "novoUser",
  nome: "Novo Usuário",
  nascimento: "2000-01-01",
  email: "novo@teste.com",
  celular: "5592929999999",
  password: "12345Ab@",
};

// Novo usuário para testes de fluxo de erro ou criação única
export const anotherUserMockAuth = {
  username: "usuarioUnicoErro",
  nome: "Usuário Teste Erro",
  nascimento: "1999-05-05",
  email: "erro@teste.com",
  celular: "85425151548",
  password: "Abc125@",
};

export const userMockSuport = {
  idUsuario: "ee5821a7-02b4-4cb1-857f-293f715d0362",
  username: "usuarioSuporte",
  nome: "Usuário Suporte",
  nascimento: "1999-05-05",
  email: "suporte@suporte.com",
  celular: "85425153542",
  password: "Abc125@",
  tipo: "2",
};

export const userMockAdmin = {
  idUsuario: "ee5821a7-02b4-4cb1-837f-293f715d0362",
  username: "admin",
  nome: "Usuário Administrador",
  nascimento: "1999-05-05",
  email: "admin@admin.com",
  celular: "85425153543",
  password: "Abc125@",
  tipo: "0",
};

export const userMockSimple = {
  idUsuario: "ee5821a7-02b4-4cb1-857f-293f713d0362",
  username: "usuario",
  nome: "Usuário Simples",
  nascimento: "1999-05-05",
  email: "user@user.com",
  celular: "85425153548",
  password: "Abc125@",
  tipo: "1",
};
