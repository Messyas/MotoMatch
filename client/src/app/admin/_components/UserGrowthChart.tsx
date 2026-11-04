"use client";

import { useMemo } from "react";
import type { UsersTimelinePoint } from "@/types/admin";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
});

type Props = {
  data: UsersTimelinePoint[];
  heightClassName?: string;
};

export function UserGrowthChart({
  data,
  heightClassName = "h-80",
}: Props) {
  const chart = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const width = Math.max(720, data.length * 90);
    const height = 320;
    const margin = { top: 20, right: 28, bottom: 40, left: 44 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const maxValue = Math.max(...data.map((d) => d.total), 1);
    const points = data.map((point, index) => {
      const x =
        margin.left +
        (data.length === 1
          ? chartWidth / 2
          : (chartWidth / Math.max(data.length - 1, 1)) * index);
      const normalized = point.total / maxValue;
      const y =
        margin.top + chartHeight - normalized * chartHeight;

      const date = new Date(`${point.month}-01T00:00:00`);

      return {
        ...point,
        x,
        y,
        label: monthFormatter.format(date),
      };
    });

    const linePath = points
      .map((point, index) =>
        index === 0
          ? `M ${point.x} ${point.y}`
          : `L ${point.x} ${point.y}`
      )
      .join(" ");

    const areaPath =
      points.length > 1
        ? [
            `M ${points[0].x} ${margin.top + chartHeight}`,
            ...points.map((point) => `L ${point.x} ${point.y}`),
            `L ${
              points[points.length - 1].x
            } ${margin.top + chartHeight}`,
            "Z",
          ].join(" ")
        : "";

    const rawYTicks = Array.from({ length: 5 }, (_, index) => {
      const value = Math.round((maxValue / 4) * index);
      const y =
        margin.top +
        chartHeight -
        (value / maxValue) * chartHeight;
      return { value, y };
    });

    const yTicks = rawYTicks.filter(
      (tick, index, ticks) =>
        ticks.findIndex((candidate) => candidate.value === tick.value) === index
    );

    return {
      width,
      height,
      margin,
      points,
      linePath,
      areaPath,
      yTicks,
    };
  }, [data]);

  if (!chart) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground">
        Sem dados suficientes para exibir a evolução.
      </div>
    );
  }

  const { width, height, margin, points, linePath, areaPath, yTicks } = chart;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Evolução da base de usuários por mês"
      className={`${heightClassName} w-full text-[#001428]`}
    >
      <defs>
        <linearGradient
          id="user-growth-area"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Y Axis grid */}
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

      {/* Area fill */}
      {areaPath && (
        <path
          d={areaPath}
          fill="url(#user-growth-area)"
          stroke="none"
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#f43f5e"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Points */}
      {points.map((point) => (
        <g key={point.month}>
          <circle
            cx={point.x}
            cy={point.y}
            r={5}
            fill="#f43f5e"
            stroke="#fff"
            strokeWidth={1.5}
          />
        </g>
      ))}

      {/* X Axis */}
      <line
        x1={margin.left}
        x2={width - margin.right}
        y1={margin.top + (height - margin.top - margin.bottom)}
        y2={margin.top + (height - margin.top - margin.bottom)}
        stroke="#d1d5db"
      />

      {/* X Axis labels */}
      {points.map((point) => (
        <text
          key={`label-${point.month}`}
          x={point.x}
          y={height - margin.bottom / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#6b7280"
        >
          {point.label}
        </text>
      ))}

      {/* Axis labels */}
      <text
        x={width / 2}
        y={height - 6}
        textAnchor="middle"
        fontSize={12}
        fill="#475569"
      >
        Meses
      </text>
      <text
        x={12}
        y={height / 2}
        textAnchor="middle"
        fontSize={12}
        fill="#475569"
        transform={`rotate(-90 12 ${height / 2})`}
      >
        Total de usuários
      </text>

      {/* Y Axis labels */}
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
  );
}
