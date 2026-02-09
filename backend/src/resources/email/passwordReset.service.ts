import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { sendEmail } from "./email.service";
import { prisma } from "../../database/prismaSingleton";

const APP_BASE_URL =
  process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
const DEFAULT_EXPIRATION_HOURS = Number(
  process.env.PASSWORD_RESET_TOKEN_EXPIRATION_HOURS ?? "1"
);

const buildPasswordResetUrl = (token: string) => {
  const url = new URL("/reset-password", APP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
};

const buildPasswordResetHtml = (
  name: string | null | undefined,
  resetUrl: string
) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Redefinição de senha</h2>
    <p>Olá${name ? ` ${name}` : ""},</p>
    <p>Recebemos uma solicitação para redefinir sua senha. Clique abaixo para continuar:</p>
    <p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:6px;">
        Redefinir senha
      </a>
    </p>
    <p>Se o botão não funcionar, copie e cole o link no navegador:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>    
    <p>Se você não solicitou essa ação, ignore este e-mail.</p>
    <p>⚠️ Este link expira em ${DEFAULT_EXPIRATION_HOURS} hora(s).</p>
  </div>
`;

export const issuePasswordResetToken = async (params: {
  idUsuario: string;
  email: string;
  nome?: string | null;
}) => {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId: params.idUsuario, tipo: "1" },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: params.idUsuario,
        token,
        expiresAt,
        tipo: "1",
      },
    }),
  ]);

  const resetUrl = buildPasswordResetUrl(token);

  const emailSent = await sendEmail({
    to: params.email,
    subject: "Redefinir senha - Moto Match",
    html: buildPasswordResetHtml(params.nome, resetUrl),
  });

  return { token, resetUrl, expiresAt, emailSent };
};

export const verifyPasswordResetToken = async (token: string) => {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });
  if (!record || record.tipo !== "1")
    return { valid: false, reason: "invalid" };

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return { valid: false, reason: "expired" };
  }

  return { valid: true, userId: record.userId };
};

export const resetPassword = async (token: string, password: string) => {
  const check = await verifyPasswordResetToken(token);
  if (!check.valid) return check;

  const hashed = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.usuario.update({
      where: { idUsuario: check.userId },
      data: { password: hashed },
    }),
    prisma.emailVerificationToken.delete({ where: { token } }),
  ]);

  return { valid: true, message: "Senha redefinida com sucesso." };
};
