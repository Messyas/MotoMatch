import type { DeviceRepository, ListDevicesOptions, ListDevicesResult } from "../domain/device-repository";

export class ListDevicesUseCase {
  constructor(private readonly deviceRepo: DeviceRepository) {}

  async execute(options?: ListDevicesOptions): Promise<ListDevicesResult> {
    return this.deviceRepo.list(options);
  }
}
