import type {
  BackendDispositivo,
  PhoneItem,
  PhoneSpecs,
  BackendCaracteristica,
} from "@/types/phones";

const specMapping: Record<string, keyof PhoneSpecs> = {
  ram: "ram",
  rom: "storage",
  main_camera: "camera",
  secondary_camera: "secondary_camera",
  tertiary_camera: "tertiary_camera",
  front_camera: "front_camera",
  battery: "battery",
  screen_size: "display",
  benchmark: "benchmark",
  processor: "processor",
  refresh_rate: "refreshRate",
};

const sanitizeNumeric = (raw: string) =>
  raw
    .trim()
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(",", ".");

const parsePriceValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = sanitizeNumeric(value);
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "object" && "toString" in value) {
    return parsePriceValue((value as { toString(): string }).toString());
  }
  return null;
};

function mapCaracteristicasToSpecs(
  caracteristicas: BackendCaracteristica[] | null | undefined
): PhoneSpecs {
  const specs: Partial<PhoneSpecs> = {};
  (caracteristicas || []).forEach((item) => {
    // Adicionamos optional chaining (?) para segurança extra
    const tipo = item.caracteristica?.tipo?.toLowerCase().trim();
    const descricao = item.caracteristica?.descricao;

    if (tipo && descricao) {
      const specKey = specMapping[tipo];
      if (specKey) {
        specs[specKey] = descricao;
      } else {
        specs[tipo] = descricao;
      }
    }
  });

  return specs as PhoneSpecs;
}

export function mapDispositivoToPhoneItem(
  dispositivo: BackendDispositivo
): PhoneItem {
  const specs = mapCaracteristicasToSpecs(dispositivo.caracteristicas);
  const precoNumber = parsePriceValue(dispositivo.preco);

  if (precoNumber !== null) {
    specs.preco = precoNumber.toString();
  }

  const phoneItem: PhoneItem = {
    id: dispositivo.idDispositivo,
    title: `${dispositivo.fabricante} ${dispositivo.modelo}`,
    imageUrls: (dispositivo.photos || []).map((photo) => photo.src),
    specs,
  };

  if (precoNumber !== null) {
    phoneItem.price = precoNumber;
  }

  if (Array.isArray(dispositivo.justificativas) && dispositivo.justificativas.length > 0) {
    phoneItem.justificativas = dispositivo.justificativas;
  }

  if (typeof dispositivo.matchScore === "number") {
    phoneItem.matchScore = dispositivo.matchScore;
  }

  if (typeof dispositivo.perfilMatchPercent === "number") {
    phoneItem.perfilMatchPercent = dispositivo.perfilMatchPercent;
  }

  if (typeof dispositivo.criteriosMatchPercent === "number") {
    phoneItem.criteriosMatchPercent = dispositivo.criteriosMatchPercent;
  }

  if (dispositivo.matchExplanation) {
    phoneItem.matchExplanation = dispositivo.matchExplanation;
  }

  if (dispositivo.historicoId) {
    phoneItem.historicoId = dispositivo.historicoId;
  }

  if (typeof dispositivo.isFavorite === "boolean") {
    phoneItem.isFavorite = dispositivo.isFavorite;
  }

  if (dispositivo.favoriteId) {
    phoneItem.favoriteId = dispositivo.favoriteId;
  }

  return phoneItem;
}

export function mapPhoneItemToBackend(item: Omit<PhoneItem, "id">): {
  fabricante: string;
  modelo: string;
  photos: { title: string; src: string }[];
  caracteristicas: { tipo: string; descricao: string }[];
  preco?: number;
} {
  const [fabricante, ...restoModelo] = item.title.split(" ");
  const modelo = restoModelo.join(" ") || fabricante;
  const preco = (() => {
    if (typeof item.price === "number" && Number.isFinite(item.price)) {
      return item.price;
    }
    return parsePriceValue(item.specs?.preco);
  })();

  const caracteristicas = Object.entries(item.specs || {})
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, descricao]) => Boolean(descricao))
    .map(([tipo, descricao]) => ({
      tipo,
      descricao: String(descricao),
    }));

  return {
    fabricante,
    modelo,
    preco: preco ?? undefined,
    // Garante que imageUrls seja um array antes de mapear
    photos: (item.imageUrls || []).map((src, index) => ({
      title: `Imagem ${index + 1}`,
      src,
    })),
    caracteristicas,
  };
}
