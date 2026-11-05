import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface DatabaseConfig {
  readonly url: string;
  readonly maxConnections?: number;
}

export type Database = ReturnType<typeof createDatabase>;
export type DatabaseClient = Database;

export function createDatabase(config: DatabaseConfig) {
  const queryClient = postgres(config.url, {
    max: config.maxConnections ?? 5,
    idle_timeout: 30,
    connect_timeout: 10,
  });
  return drizzle(queryClient);
}
