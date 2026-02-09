"use client";

import { useMemo } from "react";

type HorizontalBarChartProps = {
  data: {
    label: string;
    value: number;
  }[];
  emptyMessage?: string;
  barClassName?: string;
  valueFormatter?: (value: number) => string;
};

export function HorizontalBarChart({
  data,
  emptyMessage = "Nenhum dado disponível.",
  barClassName = "bg-gradient-to-r from-rose-400 to-pink-500",
  valueFormatter,
}: HorizontalBarChartProps) {
  const { items, maxValue } = useMemo(() => {
    if (!data.length) {
      return {
        items: [] as HorizontalBarChartProps["data"],
        maxValue: 0,
      };
    }

    const highest = Math.max(...data.map((item) => item.value));
    return {
      items: data,
      maxValue: highest,
    };
  }, [data]);

  if (!items.length || maxValue === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = Math.max(8, (item.value / maxValue) * 100);
        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-[#001428]">
              <span className="truncate">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barClassName}`}
                style={{ width: `${width}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
