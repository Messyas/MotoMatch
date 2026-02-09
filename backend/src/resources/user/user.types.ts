import { Usuario } from "@prisma/client";

export type CreateUsuarioDTO = Pick<
  Usuario,
  "username" | "nome" | "nascimento" | "email" | "celular" | "password" | "tipo"
>;

export type UpdateUsuarioDTO = Pick<
  Usuario,
  "username" | "nome" | "email" | "celular" | "tipo"
> & {
  nascimento?: Usuario["nascimento"];
};

export type ChangePasswordDTO = {
  oldPassword: string;
  newPassword: string;
};

export type newPasswordDTO = {
  newPassword: string;
};
