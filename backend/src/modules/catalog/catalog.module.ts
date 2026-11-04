import type { Database } from "../../shared/db/client";
import type { EventBus } from "../../shared/events/event-bus";
import type { Clock } from "../../shared/time/clock";
import { CreateDeviceUseCase } from "./application/create-device.use-case";
import { DeleteDeviceUseCase } from "./application/delete-device.use-case";
import { GetDeviceUseCase } from "./application/get-device.use-case";
import { ListDevicesUseCase } from "./application/list-devices.use-case";
import { UpdateDeviceUseCase } from "./application/update-device.use-case";
import type { DeviceWithSpecs } from "./domain/device";
import type { DeviceRepository, ListDevicesOptions, ListDevicesResult } from "./domain/device-repository";
import { createCatalogRoutes } from "./http/catalog.routes";
import { InMemoryDeviceRepository } from "./infrastructure/in-memory-device.repository";
import { PostgresDeviceRepository } from "./infrastructure/postgres-device.repository";

export interface CatalogModuleDeps {
  readonly db?: Database;
  readonly deviceRepo?: DeviceRepository;
  readonly events?: EventBus;
  readonly clock: Clock;
}

export interface CatalogApi {
  findDeviceById(id: string): Promise<DeviceWithSpecs | null>;
  findByBrandAndModel(brand: string, model: string): Promise<DeviceWithSpecs | null>;
  listActiveDevices(options?: ListDevicesOptions): Promise<ListDevicesResult>;
}

export function createCatalogModule(deps: CatalogModuleDeps) {
  const repo =
    deps.deviceRepo ??
    (deps.db ? new PostgresDeviceRepository(deps.db) : new InMemoryDeviceRepository());

  const getDevice = new GetDeviceUseCase(repo);
  const listDevices = new ListDevicesUseCase(repo);
  const createDevice = new CreateDeviceUseCase({
    deviceRepo: repo,
    eventBus: deps.events,
    clock: deps.clock,
  });
  const updateDevice = new UpdateDeviceUseCase({
    deviceRepo: repo,
    eventBus: deps.events,
    clock: deps.clock,
  });
  const deleteDevice = new DeleteDeviceUseCase({
    deviceRepo: repo,
    eventBus: deps.events,
    clock: deps.clock,
  });

  const routes = createCatalogRoutes({
    getDevice,
    listDevices,
    createDevice,
    updateDevice,
    deleteDevice,
  });

  const api: CatalogApi = {
    findDeviceById: (id: string) => repo.findById(id),
    findByBrandAndModel: (brand: string, model: string) => repo.findByBrandAndModel(brand, model),
    listActiveDevices: (options?: ListDevicesOptions) => listDevices.execute(options),
  };

  return {
    api,
    routes,
    jobs: [],
  };
}
