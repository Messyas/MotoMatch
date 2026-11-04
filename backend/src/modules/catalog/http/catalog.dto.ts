import { z } from "zod";

export const deviceSpecDtoSchema = z.object({
  key: z.string().min(1).max(64),
  valueNum: z.number().nullable().optional(),
  valueText: z.string().max(255).nullable().optional(),
});

export const listDevicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export const deviceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createDeviceBodySchema = z.object({
  brand: z.string().min(1).max(64),
  model: z.string().min(1).max(128),
  priceCents: z.number().int().positive(),
  photos: z.array(z.string().url()).default([]),
  source: z.enum(["manual", "mercadolivre"]).default("manual"),
  externalId: z.string().max(128).nullable().optional(),
  active: z.boolean().default(true),
  specs: z.array(deviceSpecDtoSchema).default([]),
});

export const updateDeviceBodySchema = z.object({
  brand: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(128).optional(),
  priceCents: z.number().int().positive().optional(),
  photos: z.array(z.string().url()).optional(),
  active: z.boolean().optional(),
  specs: z.array(deviceSpecDtoSchema).optional(),
});

export type CreateDeviceBody = z.infer<typeof createDeviceBodySchema>;
export type UpdateDeviceBody = z.infer<typeof updateDeviceBodySchema>;
