export interface AppErrorOptions {
  readonly context?: Record<string, unknown>;
  readonly cause?: unknown;
  readonly retryable?: boolean;
}

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.context = options.context ?? {};
    this.retryable = options.retryable ?? false;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_FAILED";
  readonly httpStatus = 400;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly httpStatus = 404;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly httpStatus = 409;
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly httpStatus = 401;
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN";
  readonly httpStatus = 403;
}

export class QuotaExhaustedError extends AppError {
  readonly code = "QUOTA_EXHAUSTED";
  readonly httpStatus = 429;
}

export class DatabaseUnavailableError extends AppError {
  readonly code = "DATABASE_UNAVAILABLE";
  readonly httpStatus = 503;

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, retryable: true });
  }
}

export interface ExternalServiceErrorInput {
  readonly provider: string;
  readonly operation: string;
  readonly status?: number | null;
  readonly retryable: boolean;
  readonly cause?: unknown;
  readonly detail?: string;
}

export class ExternalServiceError extends AppError {
  readonly code = "EXTERNAL_SERVICE_FAILED";
  readonly httpStatus = 502;

  constructor(input: ExternalServiceErrorInput) {
    const statusPart = input.status !== undefined && input.status !== null ? ` with HTTP ${input.status}` : "";
    const detailPart = input.detail ? `: ${input.detail}` : "";
    super(`${input.provider} ${input.operation} failed${statusPart}${detailPart}`, {
      context: { provider: input.provider, operation: input.operation, status: input.status },
      cause: input.cause,
      retryable: input.retryable,
    });
  }
}

export interface ConfigIssue {
  readonly path: (string | number)[];
  readonly message: string;
}

export class InvalidConfigError extends AppError {
  readonly code = "INVALID_CONFIG";
  readonly httpStatus = 500;

  constructor(issues: readonly ConfigIssue[]) {
    const formatted = issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    super(`Invalid configuration: ${formatted}`, { context: { issues: [...issues] } });
  }
}
