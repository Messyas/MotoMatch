import type { MiddlewareHandler } from "hono";
import { UnauthorizedError } from "../errors/app-error";

export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createAdminAuthMiddleware(adminKey: string): MiddlewareHandler {
  return async (c, next) => {
    const header = c.req.header("X-Admin-Key");
    if (!header || !timingSafeEqualString(header, adminKey)) {
      throw new UnauthorizedError("Invalid or missing X-Admin-Key header");
    }
    await next();
  };
}
