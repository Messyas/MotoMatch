"use client";

import type { SelectorStatItem } from "@/types/admin";

type SpecKey =
  | "ram"
  | "rom"
  | "battery"
  | "camera"
  | "benchmark"
  | "price_range";

const SPEC_TITLES: Record<SpecKey, string> = {
  ram: "Memória RAM",
  rom: "Armazenamento interno",
  battery: "Bateria",
  camera: "Câmera principal",
  benchmark: "Benchmark",
  price_range: "Faixa de preço",
};

const SPEC_HINTS: Record<SpecKey, string> = {
  ram: "Preferências de capacidade multitarefa.",
  rom: "Armazenamento desejado para apps e fotos.",
  battery: "Autonomia esperada pelos usuários.",
  camera: "Resolução favorita para fotos.",
  benchmark: "Níveis de desempenho mais buscados.",
  price_range: "Intervalos de preço preferidos.",
};

const SPEC_VALUE_LABELS: Record<SpecKey, Record<string, string>> = {
  ram: {
    "4": "4 GB",
    "6": "6 GB",
    "8": "8 GB",
    "12": "12 GB",
  },
  rom: {
    "64": "64 GB",
    "128": "128 GB",
    "256": "256 GB",
    "512": "512 GB",
  },
  battery: {
    "4000": "Uso leve (4000 mAh)",
    "4500": "Uso moderado (4500 mAh)",
    "5000": "Dia todo (5000 mAh)",
    "6000": "Mais de um dia (6000 mAh)",
  },
  camera: {
    "50": "50 MP",
    "64": "64 MP",
    "108": "108 MP",
    "200": "200 MP",
  },
  benchmark: {
    "400000": "Aprox. 400k",
    "700000": "Aprox. 700k",
    "1000000": "Aprox. 1M",
    "1500000": "Aprox. 1.5M",
  },
  price_range: {
    "600-999": "R$ 600 - R$ 999",
    "1000-1499": "R$ 1.000 - R$ 1.499",
    "1500-1999": "R$ 1.500 - R$ 1.999",
    "2000-2999": "R$ 2.000 - R$ 2.999",
    "3000-": "A partir de R$ 3.000",
  },
};

const FALLBACK_SUFFIX: Record<SpecKey, string> = {
  ram: "GB",
  rom: "GB",
  battery: "mAh",
  camera: "MP",
  benchmark: "pts",
  price_range: "",
};

function formatSpecValue(spec: SpecKey, value: string): string {
  const normalized = value.trim();
  const map = SPEC_VALUE_LABELS[spec];
  if (map && map[normalized]) {
    return map[normalized];
  }

  const numeric = normalized.replace(/[^0-9]/g, "");
  if (numeric) {
    const suffix = FALLBACK_SUFFIX[spec];
    return suffix ? `${numeric} ${suffix}` : `${numeric}`;
  }

  return normalized || "Não informado";
}

type SelectorUsageCardProps = {
  spec: SpecKey;
  items: SelectorStatItem[];
};

export function SelectorUsageCard({ spec, items }: SelectorUsageCardProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <header className="flex flex-col gap-1 border-b border-slate-100 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {SPEC_TITLES[spec]}
        </span>
        <p className="text-xs text-muted-foreground">{SPEC_HINTS[spec]}</p>
      </header>

      {items.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Ainda não há seleções registradas.
        </div>
      ) : (
        <ul className="mt-4 space-y-3 text-sm">
          {items.slice(0, 6).map((item, index) => (
            <li
              key={`${spec}-${item.value}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[#001428]"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {formatSpecValue(spec, item.value)}
                </span>
                {index === 0 && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                    Mais popular
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-slate-600">
                {item.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-4 border-t border-slate-100 pt-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Seleções totais:{" "}
          <span className="font-semibold text-[#001428]">{total}</span>
        </span>
      </footer>
    </div>
  );
}
