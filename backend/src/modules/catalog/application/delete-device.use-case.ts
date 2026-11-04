import { NotFoundError } from "../../../shared/errors/app-error";
import type { EventBus } from "../../../shared/events/event-bus";
import type { Clock } from "../../../shared/time/clock";
import type { DeviceChangedEvent } from "../domain/device-events";
import type { DeviceRepository } from "../domain/device-repository";

export interface DeleteDeviceUseCaseDeps {
  readonly deviceRepo: DeviceRepository;
  readonly eventBus?: EventBus;
  readonly clock: Clock;
}

export class DeleteDeviceUseCase {
  constructor(private readonly deps: DeleteDeviceUseCaseDeps) {}

  async execute(id: string): Promise<void> {
    const existing = await this.deps.deviceRepo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Device with id ${id} was not found`, {
        context: { deviceId: id },
      });
    }

    await this.deps.deviceRepo.delete(id);

    if (this.deps.eventBus) {
      await this.deps.eventBus.publish<DeviceChangedEvent>({
        type: "device.changed",
        occurredAt: this.deps.clock.now(),
        payload: {
          deviceId: existing.id,
          brand: existing.brand,
          model: existing.model,
          action: "deleted",
        },
      });
    }
  }
}
