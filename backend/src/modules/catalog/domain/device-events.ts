import type { DomainEvent } from "../../../shared/events/event-bus";

export interface DeviceChangedPayload {
  readonly deviceId: string;
  readonly brand: string;
  readonly model: string;
  readonly action: "created" | "updated" | "deleted";
}

export interface DeviceChangedEvent extends DomainEvent<"device.changed", DeviceChangedPayload> {}
