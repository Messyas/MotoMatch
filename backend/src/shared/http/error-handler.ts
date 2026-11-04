import type { Context } from "hono";
import { AppError } from "../errors/app-error";
import type { Logger } from "../logging/logger";

export function createErrorHandler(logger?: Logger) {
  return (error: Error, c: Context): Response => {
    if (error instanceof AppError) {
      if (error.httpStatus >= 500) {
        logger?.error("http.app_error_5xx", {
          code: error.code,
          message: error.message,
          context: error.context,
          cause: error.cause instanceof Error ? error.cause.message : error.cause,
        });
      } else {
        logger?.warn("http.app_error_4xx", {
          code: error.code,
          message: error.message,
          context: error.context,
        });
      }

      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: Object.keys(error.context).length > 0 ? error.context : undefined,
          },
        },
        error.httpStatus as any,
      );
    }

    logger?.error("http.unhandled_error", {
      message: error.message,
      stack: error.stack,
    });

    return c.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
      },
      500,
    );
  };
}
