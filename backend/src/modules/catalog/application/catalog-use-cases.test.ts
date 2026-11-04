import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import { ConflictError, NotFoundError } from "../../../shared/errors/app-error";
import { InProcessEventBus } from "../../../shared/events/event-bus";
import { FixedClock } from "../../../shared/time/clock";
import type { DeviceChangedEvent } from "../domain/device-events";
import { InMemoryDeviceRepository } from "../infrastructure/in-memory-device.repository";
import { CreateDeviceUseCase } from "./create-device.use-case";
import { DeleteDeviceUseCase } from "./delete-device.use-case";
import { GetDeviceUseCase } from "./get-device.use-case";
import { ListDevicesUseCase } from "./list-devices.use-case";
import { UpdateDeviceUseCase } from "./update-device.use-case";

describe("Catalog Use Cases", () => {
  it("creates a device and emits device.changed event", async () => {
    const repo = new InMemoryDeviceRepository();
    const clock = new FixedClock("2026-11-04T12:00:00.000Z");
    const eventBus = new InProcessEventBus();
    const events: DeviceChangedEvent[] = [];
    eventBus.subscribe<DeviceChangedEvent>("device.changed", (e) => {
      events.push(e);
    });

    const useCase = new CreateDeviceUseCase({ deviceRepo: repo, eventBus, clock });
    const created = await useCase.execute({
      brand: "Samsung",
      model: "Galaxy A55",
      priceCents: 189900,
      specs: [
        { key: "battery_mah", valueNum: 5000 },
        { key: "processor", valueText: "Exynos 1480" },
      ],
    });

    expect(created.id).toBeDefined();
    expect(created.brand).toBe("Samsung");
    expect(created.model).toBe("Galaxy A55");
    expect(created.priceCents).toBe(189900);
    expect(created.specs).toHaveLength(2);

    expect(events).toHaveLength(1);
    expect(events[0]?.payload.action).toBe("created");
    expect(events[0]?.payload.deviceId).toBe(created.id);
  });

  it("prevents duplicate device creation with ConflictError", async () => {
    const repo = new InMemoryDeviceRepository();
    const clock = new FixedClock();
    const useCase = new CreateDeviceUseCase({ deviceRepo: repo, clock });

    await useCase.execute({
      brand: "Motorola",
      model: "Moto G85",
      priceCents: 150000,
    });

    await expect(
      useCase.execute({
        brand: "motorola",
        model: "moto g85",
        priceCents: 140000,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("gets an existing device or throws NotFoundError", async () => {
    const repo = new InMemoryDeviceRepository();
    const device = aDevice().withModel("Moto Edge 50").build();
    await repo.save(device, device.specs);

    const getUseCase = new GetDeviceUseCase(repo);
    const result = await getUseCase.execute(device.id);
    expect(result.model).toBe("Moto Edge 50");

    await expect(getUseCase.execute("non-existent-id")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists active devices with pagination", async () => {
    const repo = new InMemoryDeviceRepository();
    const clock = new FixedClock();
    const d1 = aDevice().withId("d1").withModel("Model 1").build();
    const d2 = aDevice().withId("d2").withModel("Model 2").build();
    await repo.save(d1, d1.specs);
    await repo.save(d2, d2.specs);

    const listUseCase = new ListDevicesUseCase(repo);
    const result = await listUseCase.execute({ limit: 10 });
    expect(result.items).toHaveLength(2);
  });

  it("updates device and emits update event", async () => {
    const repo = new InMemoryDeviceRepository();
    const clock = new FixedClock();
    const eventBus = new InProcessEventBus();
    const events: DeviceChangedEvent[] = [];
    eventBus.subscribe<DeviceChangedEvent>("device.changed", (e) => {
      events.push(e);
    });

    const initial = aDevice().build();
    await repo.save(initial, initial.specs);

    const updateUseCase = new UpdateDeviceUseCase({ deviceRepo: repo, eventBus, clock });
    const updated = await updateUseCase.execute(initial.id, {
      priceCents: 149900,
    });

    expect(updated.priceCents).toBe(149900);
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.action).toBe("updated");
  });

  it("deletes device and emits delete event", async () => {
    const repo = new InMemoryDeviceRepository();
    const clock = new FixedClock();
    const eventBus = new InProcessEventBus();
    const events: DeviceChangedEvent[] = [];
    eventBus.subscribe<DeviceChangedEvent>("device.changed", (e) => {
      events.push(e);
    });

    const initial = aDevice().build();
    await repo.save(initial, initial.specs);

    const deleteUseCase = new DeleteDeviceUseCase({ deviceRepo: repo, eventBus, clock });
    await deleteUseCase.execute(initial.id);

    expect(await repo.findById(initial.id)).toBeNull();
    expect(events).toHaveLength(1);
    expect(events[0]?.payload.action).toBe("deleted");
  });
});
