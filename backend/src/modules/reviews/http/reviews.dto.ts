import { z } from "zod";

export const linkSourceSchema = z.object({
  provider: z.enum(["youtube", "mercadolivre", "csv", "manual"]),
  externalRef: z.string().min(1),
  intervalDays: z.number().int().positive().optional(),
});

export type LinkSourceBody = z.infer<typeof linkSourceSchema>;

export const importReviewsSchema = z.object({
  items: z
    .array(
      z.object({
        deviceId: z.string().uuid(),
        content: z.string().min(1),
        provider: z.enum(["youtube", "mercadolivre", "csv", "manual"]).optional(),
        rating: z.number().int().min(1).max(5).optional(),
        externalRef: z.string().optional(),
      }),
    )
    .min(1)
    .max(500),
});

export type ImportReviewsBody = z.infer<typeof importReviewsSchema>;
