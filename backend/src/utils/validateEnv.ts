import { cleanEnv, port, str, num, url, bool } from "envalid";

export function validateEnv() {
  cleanEnv(process.env, {
    PORT: port(),
    NODE_ENV: str({ choices: ["development", "production"] }),
    DATABASE_URL: url(),
    BCRYPT_SALT_ROUNDS: num(),
    APP_BASE_URL: url({ default: "http://localhost:3000" }),
    EMAIL_VERIFICATION_TOKEN_EXPIRATION_HOURS: num({ default: 24 }),
    GOOGLE_CLIENT_ID: str({ default: "" }),
    GOOGLE_CLIENT_SECRET: str({ default: "" }),
    GOOGLE_REFRESH_TOKEN: str({ default: "" }),
    REDIS_URL: str({ default: "redis://localhost:6379" }),
    GEMINI_API_KEY: str({ default: "" }),
    GEMINI_COMMENT_MODEL: str({ default: "gemini-1.5-pro" }),
    GEMINI_COMMENT_TEMPERATURE: num({ default: 0.2 }),
    MERCADO_LIVRE_API_URL: url({ default: "https://api.mercadolibre.com" }),
    MERCADO_LIVRE_COMMENTS_ENDPOINT: str({ default: "/devices/comments" }),
    MERCADO_LIVRE_SITE_ID: str({ default: "MLB" }),
    ENABLE_COMMENT_QUEUES: bool({ default: false }),
    CSV_SOURCE_URL_2: str({ default: "" }),
    CSV_SUMMARY_URL: str({ default: "" }),
    RECOMMENDATION_SERVICE_URL: url({
      default: "http://127.0.0.1:8000/ml/score-dispositivos",
    }),
    RECOMMENDATION_SERVICE_TIMEOUT: num({ default: 4000 }),
  });
}
