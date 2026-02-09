"use client";

import { useMemo, useState } from "react";
import type { SelectorStatMap, SelectorTimelineMap } from "@/types/admin";

type SpecKey = keyof SelectorTimelineMap;

const SPEC_CONFIG: Record<
  SpecKey,
  { label: string; subtitle: string; unitHint: string }
> = {
  ram: {
    label: "Memória RAM",
    subtitle: "Preferências mensais de RAM selecionada no console",
    unitHint: "Capacidade em GB",
  },
  rom: {
    label: "Armazenamento interno",
    subtitle: "Seleções para capacidade de armazenamento",
    unitHint: "Capacidade em GB",
  },
  battery: {
    label: "Bateria",
    subtitle: "Autonomia desejada a cada mês",
    unitHint: "Capacidade em mAh",
  },
  camera: {
    label: "Câmera principal",
    subtitle: "Resoluções mais buscadas com o tempo",
    unitHint: "Resolução em MP",
  },
  benchmark: {
    label: "Benchmark",
    subtitle: "Níveis de desempenho preferidos ao longo do tempo",
    unitHint: "Pontuação aproximada",
  },
  price_range: {
    label: "Faixa de preço",
    subtitle: "Intervalos de preço mais selecionados mês a mês",
    unitHint: "Valor em R$",
  },
};

const COLORS = [
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#10b981",
  "#06b6d4",
  "#0ea5e9",
];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
});

function buildChartData(
  spec: SpecKey,
  timeline: SelectorTimelineMap,
  stats: SelectorStatMap
) {
  const specTimeline = timeline[spec] ?? [];
  if (specTimeline.length === 0) {
    return null;
  }

  const monthKeys = Array.from(
    new Set(specTimeline.map((entry) => entry.month))
  ).sort((a, b) => a.localeCompare(b));

  const preferredOptions: string[] = (() => {
    const overall = stats[spec] ?? [];
    if (overall.length > 0) {
      return overall.slice(0, 4).map((item) => item.value);
    }
    const fallback = new Set<string>();
    specTimeline.forEach((entry) =>
      entry.counts.forEach((item) => fallback.add(item.value))
    );
    return Array.from(fallback).slice(0, 4);
  })();

  if (preferredOptions.length === 0) {
    return null;
  }

  const lines = preferredOptions.map((value) => {
    const points = monthKeys.map((month) => {
      const entry = specTimeline.find((item) => item.month === month);
      const valueCount =
        entry?.counts.find((countItem) => countItem.value === value)?.count ??
        0;
      return { month, count: valueCount };
    });
    return { value, points };
  });

  const maxValue = Math.max(
    ...lines.flatMap((line) => line.points.map((p) => p.count)),
    1
  );

  const formattedMonths = monthKeys.map((month) => {
    const date = new Date(`${month}-01T00:00:00`);
    return { key: month, label: monthFormatter.format(date) };
  });

  return {
    months: formattedMonths,
    lines,
    maxValue,
  };
}

type SelectorTrendChartProps = {
  timeline: SelectorTimelineMap;
  stats: SelectorStatMap;
};

export function SelectorTrendChart({
  timeline,
  stats,
}: SelectorTrendChartProps) {
  const [selectedSpec, setSelectedSpec] = useState<SpecKey>("ram");

  const chart = useMemo(
    () => buildChartData(selectedSpec, timeline, stats),
    [selectedSpec, timeline, stats]
  );

  const specMeta = SPEC_CONFIG[selectedSpec];

  if (!chart) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground">
        <span>
          Ainda não há histórico suficiente para calcular tendências de{" "}
          {specMeta.label.toLowerCase()}.
        </span>
        <span className="text-xs">
          As seleções aparecerão aqui conforme os usuários utilizarem o console.
        </span>
      </div>
    );
  }

  const width = 720;
  const height = 320;
  const margin = { top: 32, right: 32, bottom: 48, left: 56 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const monthCount = chart.months.length;

  function buildLinePath(points: { month: string; count: number }[]) {
    return points
      .map((point, index) => {
        const x =
          margin.left +
          (monthCount === 1
            ? chartWidth / 2
            : (chartWidth / Math.max(monthCount - 1, 1)) * index);
        const normalized = point.count / (chart?.maxValue ?? 1);  // Garantindo que chart.maxValue não seja null ou undefined
        const y =
          margin.top + chartHeight - normalized * chartHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((chart?.maxValue ?? 1 / 4) * index);  // Garantindo que chart.maxValue não seja null ou undefined
    const y =
      margin.top +
      chartHeight -
      (value / chart.maxValue) * chartHeight;
    return { value, y };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-[#001428]">
            {specMeta.label}
          </h3>
          <p className="text-xs text-muted-foreground">{specMeta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(SPEC_CONFIG) as SpecKey[]).map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpec(spec)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                selectedSpec === spec
                  ? "bg-[#001428] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {SPEC_CONFIG[spec].label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Tendência histórica para ${specMeta.label}`}
          className="w-full text-[#001428]"
        >
          {/* Grid horizontal */}
          {yTicks.map((tick) => (
            <line
              key={`grid-${tick.value}`}
              x1={margin.left}
              x2={width - margin.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeDasharray="4 4"
            />
          ))}

          {/* Eixo X */}
          <line
            x1={margin.left}
            x2={width - margin.right}
            y1={margin.top + chartHeight}
            y2={margin.top + chartHeight}
            stroke="#d1d5db"
          />

          {/* Linhas e áreas */}
          {chart.lines.map((line, lineIndex) => {
            const color = COLORS[lineIndex % COLORS.length];
            const path = buildLinePath(line.points);
            return (
              <g key={line.value}>
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {line.points.map((point, index) => {
                  const x =
                    margin.left +
                    (monthCount === 1
                      ? chartWidth / 2
                      : (chartWidth / Math.max(monthCount - 1, 1)) *
                        index);
                  const normalized = point.count / chart.maxValue;
                  const y =
                    margin.top +
                    chartHeight -
                    normalized * chartHeight;
                  return (
                    <circle
                      key={`${line.value}-${point.month}`}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={color}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Rótulos eixo X */}
          {chart.months.map((month, index) => {
            const x =
              margin.left +
              (monthCount === 1
                ? chartWidth / 2
                : (chartWidth / Math.max(monthCount - 1, 1)) * index);
            return (
              <text
                key={`label-${month.key}`}
                x={x}
                y={height - margin.bottom / 2}
                textAnchor="middle"
                fontSize={12}
                fill="#6b7280"
              >
                {month.label}
              </text>
            );
          })}

          {/* Rótulos eixo Y */}
          {yTicks.map((tick) => (
            <text
              key={`ylabel-${tick.value}`}
              x={margin.left - 12}
              y={tick.y + 4}
              textAnchor="end"
              fontSize={12}
              fill="#6b7280"
            >
              {tick.value}
            </text>
          ))}
        </svg>

        <footer className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Valores destacados
          </span>
          <ul className="flex flex-wrap items-center gap-3">
            {chart.lines.map((line, index) => (
              <li key={`legend-${line.value}`} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-[#001428]">
                  {line.value} ({specMeta.unitHint})
                </span>
              </li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}
