export interface UserCadastro {
  nome: string;
  nascimento: string; // YYYY-MM-DD
  username: string;
  email: string;
  celular: string;
  password: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserAuth {
  idUsuario: string;
  nome: string;
  username: string;
  email: string;
  celular: string;
  tipo: string;
  nascimento: string;
  emailVerificado: boolean;
  verificadoEm: string | null;
  createdAt: string;
}

export interface UserCadastroAdm {
  idUsuario: string;
  nome: string;
  nascimento: string; // YYYY-MM-DD
  username: string;
  email: string;
  celular: string;
  password: string;
  tipo: string;
}
