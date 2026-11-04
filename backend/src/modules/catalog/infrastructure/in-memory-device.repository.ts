import type { Device, DeviceSpec, DeviceWithSpecs } from "../domain/device";
import type { DeviceRepository, ListDevicesOptions, ListDevicesResult } from "../domain/device-repository";

export class InMemoryDeviceRepository implements DeviceRepository {
  private readonly devices = new Map<string, Device>();
  private readonly specsByDeviceId = new Map<string, DeviceSpec[]>();

  async findById(id: string): Promise<DeviceWithSpecs | null> {
    const device = this.devices.get(id);
    if (!device) {
      return null;
    }
    const specs = this.specsByDeviceId.get(id) ?? [];
    return { ...device, specs: [...specs] };
  }

  async findByBrandAndModel(brand: string, model: string): Promise<DeviceWithSpecs | null> {
    const brandLower = brand.trim().toLowerCase();
    const modelLower = model.trim().toLowerCase();

    for (const device of this.devices.values()) {
      if (
        device.brand.trim().toLowerCase() === brandLower &&
        device.model.trim().toLowerCase() === modelLower
      ) {
        const specs = this.specsByDeviceId.get(device.id) ?? [];
        return { ...device, specs: [...specs] };
      }
    }
    return null;
  }

  async list(options: ListDevicesOptions = {}): Promise<ListDevicesResult> {
    const { limit = 50, cursor, activeOnly = true } = options;

    let all = Array.from(this.devices.values());
    if (activeOnly) {
      all = all.filter((d) => d.active);
    }

    // Sort by createdAt desc, id desc for stable pagination
    all.sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    let startIndex = 0;
    if (cursor) {
      const idx = all.findIndex((d) => d.id === cursor);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }

    const slice = all.slice(startIndex, startIndex + limit);
    const items: DeviceWithSpecs[] = slice.map((d) => ({
      ...d,
      specs: [...(this.specsByDeviceId.get(d.id) ?? [])],
    }));

    const nextCursor =
      startIndex + limit < all.length && slice.length > 0 ? slice[slice.length - 1]?.id : undefined;

    return { items, nextCursor };
  }

  async save(device: Device, specs: readonly DeviceSpec[]): Promise<void> {
    this.devices.set(device.id, { ...device });
    this.specsByDeviceId.set(device.id, [...specs]);
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.devices.delete(id);
    this.specsByDeviceId.delete(id);
    return existed;
  }

  clear(): void {
    this.devices.clear();
    this.specsByDeviceId.clear();
  }
}
