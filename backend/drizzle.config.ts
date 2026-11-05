import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://phonematch:phonematch@localhost:5432/phonematch",
  },
});
