import { NotFoundError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/events/event-bus";
import type { Clock } from "../../../shared/time/clock";
import type { Device, DeviceWithSpecs, UpdateDeviceInput } from "../domain/device";
import type { DeviceChangedEvent } from "../domain/device-events";
import type { DeviceRepository } from "../domain/device-repository";

export interface UpdateDeviceUseCaseDeps {
  readonly deviceRepo: DeviceRepository;
  readonly eventBus?: EventBus;
  readonly clock: Clock;
}

export class UpdateDeviceUseCase {
  constructor(private readonly deps: UpdateDeviceUseCaseDeps) {}

  async execute(id: string, input: UpdateDeviceInput): Promise<DeviceWithSpecs> {
    const existing = await this.deps.deviceRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Device with id ${id} was not found`, {
        context: { deviceId: id },
      });
    }

    const now = this.deps.clock.now();

    const updated: Device = {
      ...existing,
      brand: input.brand?.trim() ?? existing.brand,
      model: input.model?.trim() ?? existing.model,
      priceCents: input.priceCents ?? existing.priceCents,
      photos: input.photos ? [...input.photos] : existing.photos,
      active: input.active ?? existing.active,
      updatedAt: now,
    };

    const specs = input.specs ? [...input.specs] : existing.specs;

    await this.deps.deviceRepo.save(updated, specs);

    if (this.deps.eventBus) {
      await this.deps.eventBus.publish<DeviceChangedEvent>({
        type: "device.changed",
        occurredAt: now,
        payload: {
          deviceId: updated.id,
          brand: updated.brand,
          model: updated.model,
          action: "updated",
        },
      });
    }

    return { ...updated, specs };
  }
}
