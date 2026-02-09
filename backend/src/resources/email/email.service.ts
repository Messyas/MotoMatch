import { google } from "googleapis";
import dotenv from "dotenv";
import { SendEmailOptions } from "../auth/auth.types";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ];

  const message = messageParts.join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✉️  E-mail enviado para ${to}`);
    return true;
  } catch (err) {
    console.error("❌ Erro ao enviar e-mail:", err);
    return false;
  }
}
