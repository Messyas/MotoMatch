export type {
  CreateDeviceInput,
  Device,
  DeviceSource,
  DeviceSpec,
  DeviceWithSpecs,
  UpdateDeviceInput,
} from "./domain/device";
export type { DeviceChangedEvent, DeviceChangedPayload } from "./domain/device-events";
export type { DeviceRepository, ListDevicesOptions, ListDevicesResult } from "./domain/device-repository";
export { InMemoryDeviceRepository } from "./infrastructure/in-memory-device.repository";
export { PostgresDeviceRepository } from "./infrastructure/postgres-device.repository";
export { createCatalogModule, type CatalogApi, type CatalogModuleDeps } from "./catalog.module";
