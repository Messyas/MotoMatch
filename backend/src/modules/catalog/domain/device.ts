export interface DeviceSpec {
  readonly key: string;
  readonly valueNum?: number | null;
  readonly valueText?: string | null;
}

export type DeviceSource = "manual" | "mercadolivre";

export interface Device {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
  readonly priceCents: number;
  readonly photos: readonly string[];
  readonly source: DeviceSource;
  readonly externalId?: string | null;
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DeviceWithSpecs extends Device {
  readonly specs: readonly DeviceSpec[];
}

export interface CreateDeviceInput {
  readonly id?: string;
  readonly brand: string;
  readonly model: string;
  readonly priceCents: number;
  readonly photos?: readonly string[];
  readonly source?: DeviceSource;
  readonly externalId?: string | null;
  readonly active?: boolean;
  readonly specs?: readonly DeviceSpec[];
}

export interface UpdateDeviceInput {
  readonly brand?: string;
  readonly model?: string;
  readonly priceCents?: number;
  readonly photos?: readonly string[];
  readonly active?: boolean;
  readonly specs?: readonly DeviceSpec[];
}
