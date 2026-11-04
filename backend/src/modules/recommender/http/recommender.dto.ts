import { z } from "zod";
import { ALL_ASPECTS } from "../domain/aspect";

export const constraintDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("maxPrice"), value: z.number().int().positive() }),
  z.object({ kind: z.literal("minPrice"), value: z.number().int().positive() }),
  z.object({ kind: z.literal("requires5g") }),
  z.object({ kind: z.literal("minRamGb"), value: z.number().positive() }),
  z.object({ kind: z.literal("minStorageGb"), value: z.number().positive() }),
  z.object({ kind: z.literal("brand"), value: z.string().min(1).max(64) }),
]);

export const recommendBodySchema = z.object({
  constraints: z.array(constraintDtoSchema).default([]),
  weights: z.record(z.enum(ALL_ASPECTS as unknown as [string, ...string[]]), z.number().min(0)).optional(),
  referenceDeviceId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(20).default(3),
});

export type RecommendBody = z.infer<typeof recommendBodySchema>;
