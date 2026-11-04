import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { normalizeWeights } from "../../recommender";
import type { HandleChatMessageUseCase } from "../application/handle-chat-message.use-case";
import { chatMessageBodySchema } from "./chat.dto";

export interface ChatRoutesDeps {
  readonly handleChatMessage: HandleChatMessageUseCase;
}

export function createChatRoutes(deps: ChatRoutesDeps) {
  const routes = new Hono();

  // POST /v1/chat
  routes.post("/", zValidator("json", chatMessageBodySchema), async (c) => {
    const body = c.req.valid("json");

    const state = body.state
      ? {
          constraints: body.state.constraints,
          weights: normalizeWeights(body.state.weights ?? {}),
          referenceDeviceId: body.state.referenceDeviceId,
        }
      : undefined;

    const result = await deps.handleChatMessage.execute({
      message: body.message,
      state,
    });

    return c.json(result);
  });

  return routes;
}
