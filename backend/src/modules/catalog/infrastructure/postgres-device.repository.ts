import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import type { Database } from "../../../shared/db/client";
import type { Device, DeviceSpec, DeviceWithSpecs } from "../domain/device";
import type { DeviceRepository, ListDevicesOptions, ListDevicesResult } from "../domain/device-repository";
import { devices, deviceSpecs } from "./catalog.schema";

export class PostgresDeviceRepository implements DeviceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<DeviceWithSpecs | null> {
    const rows = await this.db.select().from(devices).where(eq(devices.id, id)).limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }

    const specsRows = await this.db
      .select()
      .from(deviceSpecs)
      .where(eq(deviceSpecs.deviceId, id));

    return {
      id: row.id,
      brand: row.brand,
      model: row.model,
      priceCents: row.priceCents,
      photos: row.photos,
      source: row.source as Device["source"],
      externalId: row.externalId,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      specs: specsRows.map((s) => ({
        key: s.key,
        valueNum: s.valueNum,
        valueText: s.valueText,
      })),
    };
  }

  async findByBrandAndModel(brand: string, model: string): Promise<DeviceWithSpecs | null> {
    const rows = await this.db
      .select()
      .from(devices)
      .where(
        and(
          sql`lower(${devices.brand}) = lower(${brand})`,
          sql`lower(${devices.model}) = lower(${model})`,
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    const specsRows = await this.db
      .select()
      .from(deviceSpecs)
      .where(eq(deviceSpecs.deviceId, row.id));

    return {
      id: row.id,
      brand: row.brand,
      model: row.model,
      priceCents: row.priceCents,
      photos: row.photos,
      source: row.source as Device["source"],
      externalId: row.externalId,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      specs: specsRows.map((s) => ({
        key: s.key,
        valueNum: s.valueNum,
        valueText: s.valueText,
      })),
    };
  }

  async list(options: ListDevicesOptions = {}): Promise<ListDevicesResult> {
    const { limit = 50, cursor, activeOnly = true } = options;

    const conditions = [];
    if (activeOnly) {
      conditions.push(eq(devices.active, true));
    }

    if (cursor) {
      // Keyset pagination using cursor
      const cursorDevice = await this.db
        .select({ createdAt: devices.createdAt, id: devices.id })
        .from(devices)
        .where(eq(devices.id, cursor))
        .limit(1);

      if (cursorDevice[0]) {
        const { createdAt, id } = cursorDevice[0];
        conditions.push(
          sql`(${devices.createdAt}, ${devices.id}) < (${createdAt.toISOString()}, ${id})`,
        );
      }
    }

    const rows = await this.db
      .select()
      .from(devices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(devices.createdAt), desc(devices.id))
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const itemsRows = hasNext ? rows.slice(0, limit) : rows;
    const nextCursor = hasNext && itemsRows.length > 0 ? itemsRows[itemsRows.length - 1]?.id : undefined;

    if (itemsRows.length === 0) {
      return { items: [], nextCursor: undefined };
    }

    // Batch fetch specs for all returned devices to avoid N+1
    const deviceIds = itemsRows.map((d) => d.id);
    const allSpecs = await this.db
      .select()
      .from(deviceSpecs)
      .where(inArray(deviceSpecs.deviceId, deviceIds));

    const specsMap = new Map<string, DeviceSpec[]>();
    for (const spec of allSpecs) {
      let list = specsMap.get(spec.deviceId);
      if (!list) {
        list = [];
        specsMap.set(spec.deviceId, list);
      }
      list.push({
        key: spec.key,
        valueNum: spec.valueNum,
        valueText: spec.valueText,
      });
    }

    const items: DeviceWithSpecs[] = itemsRows.map((row) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      priceCents: row.priceCents,
      photos: row.photos,
      source: row.source as Device["source"],
      externalId: row.externalId,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      specs: specsMap.get(row.id) ?? [],
    }));

    return { items, nextCursor };
  }

  async save(device: Device, specs: readonly DeviceSpec[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(devices)
        .values({
          id: device.id,
          brand: device.brand,
          model: device.model,
          priceCents: device.priceCents,
          photos: [...device.photos],
          source: device.source,
          externalId: device.externalId,
          active: device.active,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
        })
        .onConflictDoUpdate({
          target: devices.id,
          set: {
            brand: device.brand,
            model: device.model,
            priceCents: device.priceCents,
            photos: [...device.photos],
            source: device.source,
            externalId: device.externalId,
            active: device.active,
            updatedAt: device.updatedAt,
          },
        });

      // Clear existing specs and insert new ones
      await tx.delete(deviceSpecs).where(eq(deviceSpecs.deviceId, device.id));

      if (specs.length > 0) {
        await tx.insert(deviceSpecs).values(
          specs.map((s) => ({
            deviceId: device.id,
            key: s.key,
            valueNum: s.valueNum ?? null,
            valueText: s.valueText ?? null,
          })),
        );
      }
    });
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.db.delete(devices).where(eq(devices.id, id));
    return (res as any)?.rowCount > 0;
  }
}
