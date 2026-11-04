import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { CreateDeviceUseCase } from "../application/create-device.use-case";
import type { DeleteDeviceUseCase } from "../application/delete-device.use-case";
import type { GetDeviceUseCase } from "../application/get-device.use-case";
import type { ListDevicesUseCase } from "../application/list-devices.use-case";
import type { UpdateDeviceUseCase } from "../application/update-device.use-case";
import {
  createDeviceBodySchema,
  deviceIdParamSchema,
  listDevicesQuerySchema,
  updateDeviceBodySchema,
} from "./catalog.dto";

export interface CatalogRoutesDeps {
  readonly getDevice: GetDeviceUseCase;
  readonly listDevices: ListDevicesUseCase;
  readonly createDevice: CreateDeviceUseCase;
  readonly updateDevice: UpdateDeviceUseCase;
  readonly deleteDevice: DeleteDeviceUseCase;
}

export function createCatalogRoutes(deps: CatalogRoutesDeps) {
  const publicRoutes = new Hono();
  const adminRoutes = new Hono();

  // Public: GET /v1/devices
  publicRoutes.get("/", zValidator("query", listDevicesQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const result = await deps.listDevices.execute(query);
    return c.json(result);
  });

  // Public: GET /v1/devices/:id
  publicRoutes.get("/:id", zValidator("param", deviceIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const device = await deps.getDevice.execute(id);
    return c.json(device);
  });

  // Admin: POST /v1/admin/devices
  adminRoutes.post("/", zValidator("json", createDeviceBodySchema), async (c) => {
    const body = c.req.valid("json");
    const created = await deps.createDevice.execute(body);
    return c.json(created, 201);
  });

  // Admin: PUT /v1/admin/devices/:id
  adminRoutes.put(
    "/:id",
    zValidator("param", deviceIdParamSchema),
    zValidator("json", updateDeviceBodySchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");
      const updated = await deps.updateDevice.execute(id, body);
      return c.json(updated);
    },
  );

  // Admin: DELETE /v1/admin/devices/:id
  adminRoutes.delete("/:id", zValidator("param", deviceIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    await deps.deleteDevice.execute(id);
    return c.body(null, 204);
  });

  return { publicRoutes, adminRoutes };
}
