import { ConflictError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/events/event-bus";
import type { Clock } from "../../../shared/time/clock";
import type { CreateDeviceInput, Device, DeviceWithSpecs } from "../domain/device";
import type { DeviceChangedEvent } from "../domain/device-events";
import type { DeviceRepository } from "../domain/device-repository";

export interface CreateDeviceUseCaseDeps {
  readonly deviceRepo: DeviceRepository;
  readonly eventBus?: EventBus;
  readonly clock: Clock;
}

export class CreateDeviceUseCase {
  constructor(private readonly deps: CreateDeviceUseCaseDeps) {}

  async execute(input: CreateDeviceInput): Promise<DeviceWithSpecs> {
    const existing = await this.deps.deviceRepo.findByBrandAndModel(input.brand, input.model);
    if (existing) {
      throw new ConflictError(`Device "${input.brand} ${input.model}" already exists`, {
        context: { brand: input.brand, model: input.model, existingId: existing.id },
      });
    }

    const now = this.deps.clock.now();
    const id = input.id ?? crypto.randomUUID();

    const device: Device = {
      id,
      brand: input.brand.trim(),
      model: input.model.trim(),
      priceCents: input.priceCents,
      photos: input.photos ? [...input.photos] : [],
      source: input.source ?? "manual",
      externalId: input.externalId ?? null,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const specs = input.specs ? [...input.specs] : [];

    await this.deps.deviceRepo.save(device, specs);

    if (this.deps.eventBus) {
      await this.deps.eventBus.publish<DeviceChangedEvent>({
        type: "device.changed",
        occurredAt: now,
        payload: {
          deviceId: device.id,
          brand: device.brand,
          model: device.model,
          action: "created",
        },
      });
    }

    return { ...device, specs };
  }
}
