import type { DeviceWithSpecs } from "../../catalog";

export type HardConstraint =
  | { readonly kind: "maxPrice"; readonly value: number }
  | { readonly kind: "minPrice"; readonly value: number }
  | { readonly kind: "requires5g" }
  | { readonly kind: "minRamGb"; readonly value: number }
  | { readonly kind: "minStorageGb"; readonly value: number }
  | { readonly kind: "brand"; readonly value: string };

function matchesConstraint(device: DeviceWithSpecs, constraint: HardConstraint): boolean {
  switch (constraint.kind) {
    case "maxPrice":
      return device.priceCents <= constraint.value;

    case "minPrice":
      return device.priceCents >= constraint.value;

    case "requires5g": {
      const has5g = device.specs.find((s) => s.key === "has_5g")?.valueNum;
      return has5g === 1;
    }

    case "minRamGb": {
      const ram = device.specs.find((s) => s.key === "ram_gb")?.valueNum;
      return (ram ?? 0) >= constraint.value;
    }

    case "minStorageGb": {
      const storage = device.specs.find((s) => s.key === "storage_gb")?.valueNum;
      return (storage ?? 0) >= constraint.value;
    }

    case "brand":
      return device.brand.trim().toLowerCase() === constraint.value.trim().toLowerCase();
  }
}

export interface HardConstraintsResult {
  readonly filtered: readonly DeviceWithSpecs[];
  readonly relaxationNotice?: string;
}

export function applyHardConstraints(
  devices: readonly DeviceWithSpecs[],
  constraints: readonly HardConstraint[],
): HardConstraintsResult {
  if (constraints.length === 0) {
    return { filtered: devices };
  }

  const strictlyMatched = devices.filter((d) =>
    constraints.every((c) => matchesConstraint(d, c)),
  );

  if (strictlyMatched.length > 0) {
    return { filtered: strictlyMatched };
  }

  // Relaxation: if maxPrice eliminated everything, relax maxPrice to the closest candidate
  const maxPriceConstraint = constraints.find((c) => c.kind === "maxPrice");
  if (maxPriceConstraint && maxPriceConstraint.kind === "maxPrice") {
    const withoutPriceConstraints = constraints.filter((c) => c.kind !== "maxPrice");
    const candidatesWithoutPrice = devices.filter((d) =>
      withoutPriceConstraints.every((c) => matchesConstraint(d, c)),
    );

    if (candidatesWithoutPrice.length > 0) {
      // Find closest price above the constraint
      const sortedByPrice = [...candidatesWithoutPrice].sort((a, b) => a.priceCents - b.priceCents);
      const closest = sortedByPrice[0]!;
      const originalReais = (maxPriceConstraint.value / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const closestReais = (closest.priceCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      return {
        filtered: sortedByPrice.slice(0, 5),
        relaxationNotice: `Nenhum modelo encontrado até ${originalReais}. O mais próximo disponível é o ${closest.brand} ${closest.model} por ${closestReais}.`,
      };
    }
  }

  // Fallback: relax 5G if needed
  const requires5gConstraint = constraints.find((c) => c.kind === "requires5g");
  if (requires5gConstraint) {
    const without5g = constraints.filter((c) => c.kind !== "requires5g");
    const candidatesWithout5g = devices.filter((d) =>
      without5g.every((c) => matchesConstraint(d, c)),
    );

    if (candidatesWithout5g.length > 0) {
      return {
        filtered: candidatesWithout5g,
        relaxationNotice: "Nenhum modelo 5G encontrado com os critérios pedidos. Exibindo modelos 4G compatíveis.",
      };
    }
  }

  return { filtered: [] };
}
