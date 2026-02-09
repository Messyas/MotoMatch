import { google, gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

const REQUIRED_CLIENT_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

const REFRESH_TOKEN_ENV = "GOOGLE_REFRESH_TOKEN";

const DEFAULT_REDIRECT_URI =
  process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
  "http://localhost:3001/api/auth/google/callback";

let cachedSenderEmail: string | null = null;

const isDevelopment = process.env.NODE_ENV !== "production";

const getEnvValue = (key: string) => {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
};

const hasAll = (keys: readonly string[]) =>
  keys.every((envVar) => getEnvValue(envVar).length > 0);

export const isGmailConfigured = (): boolean =>
  hasAll([...REQUIRED_CLIENT_ENV_VARS, REFRESH_TOKEN_ENV]);

export const isGoogleClientConfigured = (): boolean =>
  hasAll(REQUIRED_CLIENT_ENV_VARS);

export const hasRefreshToken = (): boolean =>
  getEnvValue(REFRESH_TOKEN_ENV).length > 0;

export const getOAuthClient = (
  redirectUri: string = DEFAULT_REDIRECT_URI
): OAuth2Client => {
  if (!isGoogleClientConfigured()) {
    throw new Error(
      "Variáveis de ambiente GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET são obrigatórias."
    );
  }

  const clientId = getEnvValue("GOOGLE_CLIENT_ID");
  const clientSecret = getEnvValue("GOOGLE_CLIENT_SECRET");

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  if (hasRefreshToken()) {
    oauth2Client.setCredentials({
      refresh_token: getEnvValue(REFRESH_TOKEN_ENV),
    });
  }

  return oauth2Client;
};

const resolveSenderEmail = async (gmail: gmail_v1.Gmail) => {
  if (process.env.GMAIL_SENDER && process.env.GMAIL_SENDER.trim().length > 0) {
    return process.env.GMAIL_SENDER.trim();
  }

  if (cachedSenderEmail) {
    return cachedSenderEmail;
  }

  const profile = await gmail.users.getProfile({ userId: "me" });

  if (!profile.data.emailAddress) {
    throw new Error("Não foi possível identificar o endereço de e-mail do remetente.");
  }

  cachedSenderEmail = profile.data.emailAddress;
  return cachedSenderEmail;
};

const toBase64Url = (value: string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const sendGmailEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<string | undefined> => {
  if (!isGmailConfigured()) {
    throw new Error("Credenciais Google não configuradas para envio de e-mails.");
  }

  try {
    const oauth2Client = getOAuthClient();
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const sender = await resolveSenderEmail(gmail);

    const accessToken = await oauth2Client.getAccessToken();
    if (!accessToken?.token) {
      throw new Error("Não foi possível obter o access token para envio via Gmail.");
    }

    const messageParts = [
      `From: ${sender}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      "",
      html,
    ];

    const rawMessage = toBase64Url(messageParts.join("\r\n"));

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage },
    });

    if (isDevelopment) {
      console.info("[email] E-mail enviado via Gmail API:", {
        to,
        subject,
        id: response.data.id,
      });
    }

    return response.data.id ?? undefined;
  } catch (error) {
    if (isDevelopment) {
      console.error("[email] Falha ao enviar e-mail via Gmail API:", error);
    }
    throw error;
  }
};
