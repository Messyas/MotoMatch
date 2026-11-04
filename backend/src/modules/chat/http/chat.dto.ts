import { z } from "zod";
import { ALL_ASPECTS } from "../../recommender";

const constraintSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("maxPrice"), value: z.number().int().positive() }),
  z.object({ kind: z.literal("minPrice"), value: z.number().int().positive() }),
  z.object({ kind: z.literal("requires5g") }),
  z.object({ kind: z.literal("minRamGb"), value: z.number().positive() }),
  z.object({ kind: z.literal("minStorageGb"), value: z.number().positive() }),
  z.object({ kind: z.literal("brand"), value: z.string().min(1).max(64) }),
]);

export const chatStateSchema = z.object({
  constraints: z.array(constraintSchema).default([]),
  weights: z.record(z.enum(ALL_ASPECTS as unknown as [string, ...string[]]), z.number()).optional(),
  referenceDeviceId: z.string().uuid().optional(),
});

export const chatMessageBodySchema = z.object({
  message: z.string().min(1).max(1000),
  state: chatStateSchema.optional(),
});

export type ChatMessageBody = z.infer<typeof chatMessageBodySchema>;
