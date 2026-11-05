import { z } from "zod";

export const feedbackBodySchema = z.object({
  sessionId: z.string().min(1).max(64),
  deviceId: z.string().uuid(),
  intentSig: z.string().min(1).max(128).default("default"),
  kind: z.enum(["up", "down", "detail", "compare"]),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;

