import { describe, expect, it } from "bun:test";
import { MemoryLogger } from "../logging/logger";
import { type DomainEvent, InProcessEventBus } from "./event-bus";

interface DeviceChangedEvent extends DomainEvent<"device.changed", { deviceId: string }> {}

describe("InProcessEventBus", () => {
  it("delivers events to subscribers and supports unsubscription", async () => {
    const bus = new InProcessEventBus();
    const received: string[] = [];

    const unsubscribe = bus.subscribe<DeviceChangedEvent>("device.changed", (event) => {
      received.push(event.payload.deviceId);
    });

    await bus.publish<DeviceChangedEvent>({
      type: "device.changed",
      occurredAt: new Date(),
      payload: { deviceId: "dev-1" },
    });

    expect(received).toEqual(["dev-1"]);

    unsubscribe();

    await bus.publish<DeviceChangedEvent>({
      type: "device.changed",
      occurredAt: new Date(),
      payload: { deviceId: "dev-2" },
    });

    expect(received).toEqual(["dev-1"]);
  });

  it("isolates errors in handlers and logs them", async () => {
    const logger = new MemoryLogger();
    const bus = new InProcessEventBus(logger);

    bus.subscribe<DeviceChangedEvent>("device.changed", () => {
      throw new Error("handler failure");
    });

    let secondCalled = false;
    bus.subscribe<DeviceChangedEvent>("device.changed", () => {
      secondCalled = true;
    });

    await bus.publish<DeviceChangedEvent>({
      type: "device.changed",
      occurredAt: new Date(),
      payload: { deviceId: "dev-err" },
    });

    expect(secondCalled).toBe(true);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]?.event).toBe("events.handler_sync_failed");
  });
});
