import type { DeviceWithSpecs } from "../../catalog";
import type { Aspect } from "./aspect";
import { scoreProcessor } from "./processor-tiers";

export interface CatalogStats {
  readonly computedAt: Date;
  readonly sampleCount: number;
  readonly sortedValues: Record<string, readonly number[]>;
}

export function computePercentile(value: number, sortedList: readonly number[]): number {
  if (sortedList.length === 0) {
    return 0.5;
  }
  const last = sortedList[sortedList.length - 1];
  if (sortedList.length === 1 || (last !== undefined && value >= last)) {
    return 1.0;
  }

  // Count how many values in catalog are strictly less than value, and how many are equal
  let lessCount = 0;
  let equalCount = 0;

  for (const item of sortedList) {
    if (item < value) {
      lessCount++;
    } else if (item === value) {
      equalCount++;
    } else {
      break;
    }
  }

  // Empirical CDF with mid-rank tie breaking: (less + 0.5 * equal) / N
  const rank = (lessCount + 0.5 * equalCount) / sortedList.length;
  return Number(Math.max(0.05, Math.min(1.0, rank)).toFixed(4));
}

export function computeCatalogStats(devices: readonly DeviceWithSpecs[]): CatalogStats {
  const priceList: number[] = [];
  const specsMap: Record<string, number[]> = {
    battery_mah: [],
    ram_gb: [],
    storage_gb: [],
    main_camera_mp: [],
    screen_size_inches: [],
  };

  for (const device of devices) {
    if (!device.active) continue;

    priceList.push(device.priceCents);

    for (const spec of device.specs) {
      if (spec.valueNum !== null && spec.valueNum !== undefined) {
        let list = specsMap[spec.key];
        if (!list) {
          list = [];
          specsMap[spec.key] = list;
        }
        list.push(spec.valueNum);
      }
    }
  }

  const sortedValues: Record<string, number[]> = {
    price_cents: priceList.sort((a, b) => a - b),
  };

  for (const [key, list] of Object.entries(specsMap)) {
    sortedValues[key] = [...list].sort((a, b) => a - b);
  }

  return {
    computedAt: new Date(),
    sampleCount: devices.filter((d) => d.active).length,
    sortedValues,
  };
}

export function computeSpecScore(device: DeviceWithSpecs, aspect: Aspect, stats: CatalogStats): number {
  const getNumericSpec = (key: string): number | null => {
    const s = device.specs.find((item) => item.key === key);
    return s?.valueNum ?? null;
  };

  const getTextSpec = (key: string): string | null => {
    const s = device.specs.find((item) => item.key === key);
    return s?.valueText ?? null;
  };

  switch (aspect) {
    case "battery": {
      const mah = getNumericSpec("battery_mah");
      if (!mah) return 0.5;
      const sorted = stats.sortedValues.battery_mah ?? [];
      return computePercentile(mah, sorted);
    }

    case "performance": {
      const procName = getTextSpec("processor");
      const benchmark = getNumericSpec("benchmark_score");
      const procScore = scoreProcessor(procName, benchmark);

      const ram = getNumericSpec("ram_gb");
      const ramScore = ram ? computePercentile(ram, stats.sortedValues.ram_gb ?? []) : 0.5;

      // 60% Processor + 40% RAM percentile
      return Number((0.6 * procScore + 0.4 * ramScore).toFixed(4));
    }

    case "storage": {
      const storage = getNumericSpec("storage_gb");
      if (!storage) return 0.5;
      const sorted = stats.sortedValues.storage_gb ?? [];
      return computePercentile(storage, sorted);
    }

    case "camera": {
      const mp = getNumericSpec("main_camera_mp");
      if (!mp) return 0.5;
      const sorted = stats.sortedValues.main_camera_mp ?? [];
      return computePercentile(mp, sorted);
    }

    case "screen": {
      const screen = getNumericSpec("screen_size_inches");
      if (!screen) return 0.5;
      const sorted = stats.sortedValues.screen_size_inches ?? [];
      return computePercentile(screen, sorted);
    }

    case "valueForMoney": {
      // Lower price relative to performance gives higher value for money
      const priceSorted = stats.sortedValues.price_cents ?? [];
      const pricePercentile = computePercentile(device.priceCents, priceSorted);
      // Inverse: cheaper phone has higher value for money
      return Number((1.05 - pricePercentile).toFixed(4));
    }
  }
}
