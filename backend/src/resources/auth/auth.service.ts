import { Prisma, Usuario } from "@prisma/client";
import { LoginDTO, GoogleProfile, GoogleTokenPayload } from "./auth.types";
import { compare, genSalt, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "../../database/prismaSingleton";


export const CheckCredentials = async (
  data: LoginDTO
): Promise<Usuario | null> => {
  const user = await prisma.usuario.findFirst({
    where: { username: data.username },
  });
  if (user) {
    const ok = await compare(data.password, user.password);
    if (ok) return user;
  }
  return null;
};

const GOOGLE_PROVIDER = "google";
const USERNAME_MAX_LENGTH = 30;
const DEFAULT_BIRTHDATE = new Date("1970-01-01T00:00:00.000Z");
const PHONE_LENGTH = 11;

const sanitizeUsernameFragment = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w.]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const resolveSaltRounds = () => {
  const raw =
    process.env.ROUNDS_BCRYPT ?? process.env.BCRYPT_SALT_ROUNDS ?? "10";
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 10;
};

const generateRandomPasswordHash = async (): Promise<string> => {
  const saltRounds = resolveSaltRounds();
  const salt = await genSalt(saltRounds);
  const passwordSeed = randomBytes(32).toString("hex");
  return hash(passwordSeed, salt);
};

const generateUniqueUsername = async (
  tx: Prisma.TransactionClient,
  profile: GoogleProfile
): Promise<string> => {
  const emailLocal = profile.email
    ? profile.email.split("@")[0]?.toLowerCase() ?? ""
    : "";
  const nameFallback = profile.name?.replace(/\s+/g, ".") ?? "";

  let base =
    sanitizeUsernameFragment(emailLocal) ||
    sanitizeUsernameFragment(nameFallback) ||
    `${GOOGLE_PROVIDER}${(profile.id ?? profile.sub ?? "")
      .toString()
      .slice(-6)}`;

  if (base.length === 0) {
    base = `${GOOGLE_PROVIDER}user`;
  }

  base = base.slice(0, USERNAME_MAX_LENGTH);

  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await tx.usuario.findUnique({
      where: { username: candidate },
    });

    if (!existing) {
      return candidate;
    }

    const suffixStr = `${suffix++}`;
    const baseSlice = base.slice(
      0,
      Math.max(1, USERNAME_MAX_LENGTH - suffixStr.length)
    );
    candidate = `${baseSlice}${suffixStr}`;
  }
};

const randomDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");

const generateUniqueCelular = async (
  tx: Prisma.TransactionClient,
  providerId: string
): Promise<string> => {
  const digits = providerId.replace(/\D/g, "");
  let candidate = digits.slice(-PHONE_LENGTH);

  if (candidate.length < PHONE_LENGTH) {
    candidate = candidate.padStart(PHONE_LENGTH, "0");
  }

  const tried = new Set<string>();

  for (let attempt = 0; attempt < 15; attempt++) {
    if (!candidate || tried.has(candidate)) {
      candidate = randomDigits(PHONE_LENGTH);
    }

    tried.add(candidate);

    const existing = await tx.usuario.findUnique({
      where: { celular: candidate },
    });

    if (!existing) {
      return candidate;
    }

    candidate = (
      (Number(candidate) + 1) %
      Number.parseInt("9".repeat(PHONE_LENGTH), 10)
    )
      .toString()
      .padStart(PHONE_LENGTH, "0");
  }

  throw new Error(
    "Não foi possível gerar um número de celular exclusivo para conta Google."
  );
};

interface UpsertGoogleUserInput {
  profile: GoogleProfile;
  tokens: GoogleTokenPayload;
}

export const upsertUsuarioFromGoogle = async ({
  profile,
  tokens,
}: UpsertGoogleUserInput): Promise<Usuario> => {
  const email = profile.email?.toLowerCase();
  const providerId = profile.id ?? profile.sub;

  if (!email) {
    throw new Error("A conta Google não retornou um e-mail válido.");
  }

  if (!providerId) {
    throw new Error("A conta Google não retornou um identificador válido.");
  }

  const verified = profile.verified_email ?? true;

  return prisma.$transaction(async (tx) => {
    const existingAccount = await tx.contaOAuth.findUnique({
      where: {
        provedor_provedorId: {
          provedor: GOOGLE_PROVIDER,
          provedorId: providerId,
        },
      },
      include: { usuario: true },
    });

    if (existingAccount) {
      await tx.contaOAuth.update({
        where: { idConta: existingAccount.idConta },
        data: {
          emailProvedor: email,
          fotoPerfil: profile.picture ?? existingAccount.fotoPerfil,
          accessToken: tokens.accessToken ?? existingAccount.accessToken,
          refreshToken: tokens.refreshToken ?? existingAccount.refreshToken,
        },
      });

      if (!existingAccount.usuario.emailVerificado && verified) {
        return tx.usuario.update({
          where: { idUsuario: existingAccount.usuario.idUsuario },
          data: {
            emailVerificado: true,
            verificadoEm: new Date(),
          },
        });
      }

      return existingAccount.usuario;
    }

    let user = await tx.usuario.findUnique({
      where: { email },
    });

    if (!user) {
      const username = await generateUniqueUsername(tx, profile);
      const celular = await generateUniqueCelular(tx, providerId);
      const password = await generateRandomPasswordHash();

      user = await tx.usuario.create({
        data: {
          username,
          nome: profile.name ?? username,
          email,
          celular,
          password,
          nascimento: DEFAULT_BIRTHDATE,
          tipo: "1",
          emailVerificado: verified,
          verificadoEm: verified ? new Date() : null,
        },
      });
    } else if (!user.emailVerificado && verified) {
      user = await tx.usuario.update({
        where: { idUsuario: user.idUsuario },
        data: {
          emailVerificado: true,
          verificadoEm: new Date(),
        },
      });
    }

    await tx.contaOAuth.create({
      data: {
        provedor: GOOGLE_PROVIDER,
        provedorId: providerId,
        emailProvedor: email,
        fotoPerfil: profile.picture ?? null,
        accessToken: tokens.accessToken ?? null,
        refreshToken: tokens.refreshToken ?? null,
        idUsuario: user.idUsuario,
      },
    });

    return user;
  });
};
