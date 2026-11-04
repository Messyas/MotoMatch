/** Typed, descriptive errors (see docs/ARQUITETURA.md §16.6). */
export abstract class AppError extends Error {
  abstract readonly code: string;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;

  constructor(message: string, options: { context?: Record<string, unknown>; cause?: unknown; retryable?: boolean } = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.context = options.context ?? {};
    this.retryable = options.retryable ?? false;
  }
}

export class InvalidConfigError extends AppError {
  readonly code = "INVALID_CONFIG";
  constructor(issues: string[]) {
    super(`Invalid configuration: ${issues.join("; ")}. Copy .env.example to .env and fill in the values.`, {
      context: { issues },
    });
  }
}

export interface ExternalServiceErrorInput {
  provider: string;
  operation: string;
  status?: number | null;
  reason?: string;
  detail?: string;
  cause?: unknown;
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export class ExternalServiceError extends AppError {
  readonly code = "EXTERNAL_SERVICE_FAILED";
  readonly provider: string;
  readonly operation: string;
  readonly status: number | null;
  readonly reason: string | undefined;

  constructor(input: ExternalServiceErrorInput) {
    const status = input.status ?? null;
    const statusText = status === null ? "with a network error" : `with HTTP ${status}`;
    const reasonText = input.reason ? ` (${input.reason})` : "";
    const detailText = input.detail ? `: ${input.detail}` : "";
    super(`${input.provider} ${input.operation} failed ${statusText}${reasonText}${detailText}`, {
      context: { provider: input.provider, operation: input.operation, status, reason: input.reason },
      cause: input.cause,
      retryable: status === null || RETRYABLE_STATUSES.has(status),
    });
    this.provider = input.provider;
    this.operation = input.operation;
    this.status = status;
    this.reason = input.reason;
  }
}
