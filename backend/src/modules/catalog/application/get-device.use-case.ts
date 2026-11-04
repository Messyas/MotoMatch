import { NotFoundError } from "../../../shared/errors/app-error";
import type { DeviceWithSpecs } from "../domain/device";
import type { DeviceRepository } from "../domain/device-repository";

export class GetDeviceUseCase {
  constructor(private readonly deviceRepo: DeviceRepository) {}

  async execute(id: string): Promise<DeviceWithSpecs> {
    const device = await this.deviceRepo.findById(id);
    if (!device) {
      throw new NotFoundError(`Device with id ${id} was not found`, {
        context: { deviceId: id },
      });
    }
    return device;
  }
}
