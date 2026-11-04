import type { Device, DeviceSpec, DeviceWithSpecs } from "./device";

export interface ListDevicesOptions {
  readonly limit?: number;
  readonly cursor?: string;
  readonly activeOnly?: boolean;
}

export interface ListDevicesResult {
  readonly items: readonly DeviceWithSpecs[];
  readonly nextCursor?: string;
}

export interface DeviceRepository {
  findById(id: string): Promise<DeviceWithSpecs | null>;
  findByBrandAndModel(brand: string, model: string): Promise<DeviceWithSpecs | null>;
  list(options?: ListDevicesOptions): Promise<ListDevicesResult>;
  save(device: Device, specs: readonly DeviceSpec[]): Promise<void>;
  delete(id: string): Promise<boolean>;
}
