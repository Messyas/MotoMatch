export interface LogContext extends Record<string, unknown> {}

export interface Logger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "adminkey",
  "admin_key",
  "cronsecret",
  "cron_secret",
  "key",
]);

function maskSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveData(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = maskSensitiveData(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface LoggerOptions {
  readonly minLevel?: LogLevel;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class StructuredLogger implements Logger {
  private readonly minLevelWeight: number;

  constructor(options: LoggerOptions = {}) {
    this.minLevelWeight = LEVEL_WEIGHT[options.minLevel ?? "info"];
  }

  private log(level: LogLevel, event: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < this.minLevelWeight) {
      return;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...(context ? (maskSensitiveData(context) as LogContext) : {}),
    };

    const serialized = JSON.stringify(payload);
    if (level === "error") {
      console.error(serialized);
    } else if (level === "warn") {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }

  debug(event: string, context?: LogContext): void {
    this.log("debug", event, context);
  }

  info(event: string, context?: LogContext): void {
    this.log("info", event, context);
  }

  warn(event: string, context?: LogContext): void {
    this.log("warn", event, context);
  }

  error(event: string, context?: LogContext): void {
    this.log("error", event, context);
  }
}

export interface MemoryLogEntry {
  readonly level: LogLevel;
  readonly event: string;
  readonly context?: LogContext;
  readonly timestamp: string;
}

export class MemoryLogger implements Logger {
  readonly entries: MemoryLogEntry[] = [];

  private record(level: LogLevel, event: string, context?: LogContext): void {
    this.entries.push({
      level,
      event,
      context: context ? (maskSensitiveData(context) as LogContext) : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  debug(event: string, context?: LogContext): void {
    this.record("debug", event, context);
  }

  info(event: string, context?: LogContext): void {
    this.record("info", event, context);
  }

  warn(event: string, context?: LogContext): void {
    this.record("warn", event, context);
  }

  error(event: string, context?: LogContext): void {
    this.record("error", event, context);
  }

  clear(): void {
    this.entries.length = 0;
  }
}
