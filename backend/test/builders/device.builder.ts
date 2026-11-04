import type { DeviceSpec, DeviceWithSpecs } from "../../src/modules/catalog/domain/device";

export class DeviceBuilder {
  private id: string = crypto.randomUUID();
  private brand = "Motorola";
  private model = "Moto G85";
  private priceCents = 179900;
  private photos: string[] = ["https://example.com/moto-g85.jpg"];
  private source: "manual" | "mercadolivre" = "manual";
  private externalId: string | null = null;
  private active = true;
  private createdAt = new Date("2026-11-04T12:00:00.000Z");
  private updatedAt = new Date("2026-11-04T12:00:00.000Z");
  private specs: DeviceSpec[] = [
    { key: "battery_mah", valueNum: 5000 },
    { key: "ram_gb", valueNum: 8 },
    { key: "storage_gb", valueNum: 256 },
    { key: "has_5g", valueNum: 1 },
    { key: "screen_size_inches", valueNum: 6.67 },
    { key: "main_camera_mp", valueNum: 50 },
    { key: "processor", valueText: "Snapdragon 6s Gen 3" },
  ];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withBrand(brand: string): this {
    this.brand = brand;
    return this;
  }

  withModel(model: string): this {
    this.model = model;
    return this;
  }

  withPriceCents(cents: number): this {
    this.priceCents = cents;
    return this;
  }

  withBatteryMah(mah: number): this {
    this.withNumericSpec("battery_mah", mah);
    return this;
  }

  withRamGb(gb: number): this {
    this.withNumericSpec("ram_gb", gb);
    return this;
  }

  withStorageGb(gb: number): this {
    this.withNumericSpec("storage_gb", gb);
    return this;
  }

  with5g(has5g = true): this {
    this.withNumericSpec("has_5g", has5g ? 1 : 0);
    return this;
  }

  withProcessor(processor: string): this {
    this.withTextSpec("processor", processor);
    return this;
  }

  withNumericSpec(key: string, value: number): this {
    this.specs = this.specs.filter((s) => s.key !== key);
    this.specs.push({ key, valueNum: value });
    return this;
  }

  withTextSpec(key: string, value: string): this {
    this.specs = this.specs.filter((s) => s.key !== key);
    this.specs.push({ key, valueText: value });
    return this;
  }

  withActive(active: boolean): this {
    this.active = active;
    return this;
  }

  build(): DeviceWithSpecs {
    return {
      id: this.id,
      brand: this.brand,
      model: this.model,
      priceCents: this.priceCents,
      photos: [...this.photos],
      source: this.source,
      externalId: this.externalId,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      specs: [...this.specs],
    };
  }
}

export const aDevice = () => new DeviceBuilder();
