import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "../errors/app-error";
import { timingSafeEqualString } from "./admin-auth.middleware";

export function createCronAuthMiddleware(expectedSecret: string): MiddlewareHandler {
  return async (c, next) => {
    const headerValue = c.req.header("X-Cron-Secret");
    if (!headerValue || !timingSafeEqualString(headerValue, expectedSecret)) {
      throw new UnauthorizedError("Invalid or missing X-Cron-Secret header");
    }
    await next();
  };
}
