import { randomBytes } from "crypto";
import { sendEmail } from "../email/email.service";
import { prisma } from "../../database/prismaSingleton";

const APP_BASE_URL =
  process.env.APP_BASE_URL?.trim() || "http://localhost:3000";
const DEFAULT_EXPIRATION_HOURS = Number(
  process.env.EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS ?? "24"
);

const buildVerificationUrl = (token: string) => {
  const url = new URL("/verify-email", APP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
};

const buildEmailHtml = (
  name: string | null | undefined,
  verificationUrl: string
) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Confirme seu e-mail</h2>
    <p>Olá${name ? ` ${name}` : ""},</p>
    <p>Recebemos seu cadastro. Clique no botão abaixo para confirmar seu e-mail:</p>
    <p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:6px;">
        Confirmar e-mail
      </a>
    </p>
    <p>Se o botão não funcionar, copie e cole o link no navegador:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>⚠️ Este link expira em ${DEFAULT_EXPIRATION_HOURS} hora(s).</p>
  </div>
`;

export type VerifyEmailStatus =
  | "success"
  | "invalid"
  | "expired"
  | "already-verified";

export interface VerifyEmailResult {
  status: VerifyEmailStatus;
  email?: string;
  userId?: string;
  verifiedAt?: Date;
}

export interface IssueEmailVerificationResult {
  token: string;
  verificationUrl: string;
  expiresAt: Date;
  emailSent: boolean;
}

/* ===============================
 * GERAR E ENVIAR TOKEN
 * =============================== */
export const issueEmailVerificationToken = async (params: {
  idUsuario: string;
  email: string;
  nome?: string | null;
}): Promise<IssueEmailVerificationResult> => {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + DEFAULT_EXPIRATION_HOURS);

  // Remove tokens antigos e cria o novo
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({
      where: { userId: params.idUsuario, tipo: "0" },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: params.idUsuario,
        token,
        expiresAt,
        tipo: "0",
      },
    }),
  ]);

  const verificationUrl = buildVerificationUrl(token);

  // Chama o serviço de e-mail
  const emailSent = await sendEmail({
    to: params.email,
    subject: "Confirme seu e-mail - Moto Match",
    html: buildEmailHtml(params.nome, verificationUrl),
  });

  return {
    token,
    verificationUrl,
    expiresAt,
    emailSent,
  };
};

/* ===============================
 * VERIFICAR TOKEN
 * =============================== */
export const verifyEmailToken = async (
  token: string
): Promise<VerifyEmailResult> => {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record || record.tipo !== "0") {
    return { status: "invalid" };
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return { status: "expired", userId: record.userId };
  }

  const user = await prisma.usuario.findUnique({
    where: { idUsuario: record.userId },
  });

  if (!user) {
    await prisma.emailVerificationToken.delete({ where: { token } });
    return { status: "invalid" };
  }

  if (user.emailVerificado) {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.idUsuario, tipo: "0" },
    });
    return {
      status: "already-verified",
      email: user.email,
      userId: user.idUsuario,
      verifiedAt: user.verificadoEm ?? undefined,
    };
  }

  const verifiedAt = new Date();

  await prisma.$transaction([
    prisma.usuario.update({
      where: { idUsuario: user.idUsuario },
      data: {
        emailVerificado: true,
        verificadoEm: verifiedAt,
      },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: user.idUsuario, tipo: "0" },
    }),
  ]);

  return {
    status: "success",
    email: user.email,
    userId: user.idUsuario,
    verifiedAt,
  };
};
