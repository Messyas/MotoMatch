import { Usuario } from "@prisma/client";

export type SignUpDTO = Pick<
  Usuario,
  "username" | "nome" | "nascimento" | "email" | "celular" | "password"
>;
export type LoginDTO = Pick<Usuario, "username" | "password">;

export interface GoogleProfile {
  id?: string | null;
  sub?: string | null;
  email?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  verified_email?: boolean | null;
}

export interface GoogleTokenPayload {
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  scope?: string | null;
  tokenType?: string | null;
  expiryDate?: number | null;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}
