import { z } from "zod";

export const profileFormSchema = z.object({
  nome: z.string(),
  email: z.string(),
  celular: z
    .string()
    .regex(
      /^\d{11,15}$/,
      "O celular deve conter apenas números, com DDD (11 a 15 dígitos)."
    ),
  tipo: z.string(),
  username: z
    .string()
    .min(4, "Nome de usuário deve ter no mínimo 4 caracteres")
    .max(45, "Nome de usuário deve ter no máximo 45 caracteres")
    .regex(
      /^[a-zA-Z0-9._]+$/,
      "Username só pode conter letras, números, '.' ou '_'."
    ),
});

export const passwordFormSchema = z
  .object({
    oldPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter no mínimo 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        "A senha precisa de 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial."
      ),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "A nova senha não pode ser igual à antiga.",
    path: ["newPassword"],
  });

export type ProfileFormData = z.infer<typeof profileFormSchema>;
export type PasswordFormData = z.infer<typeof passwordFormSchema>;
