"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type PriceRangeBarChartProps = {
  data: {
    label: string;
    value: number;
  }[];
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
};

const chartConfig = {
  value: {
    label: "Pesquisas",
    color: "hsl(217.2 91.2% 59.8%)",
  },
} satisfies ChartConfig;

const defaultNumberFormatter = new Intl.NumberFormat("pt-BR");

export function PriceRangeBarChart({
  data,
  emptyMessage = "Nenhuma faixa de preço registrada nas pesquisas.",
  valueFormatter,
}: PriceRangeBarChartProps) {
  const hasValues = data.some((item) => item.value > 0);
  const formatValue = (value: number) =>
    valueFormatter?.(value) ?? defaultNumberFormatter.format(value);

  if (!data.length || !hasValues) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ChartContainer
      className="aspect-auto h-[360px] w-full text-[0.8rem]"
      config={chartConfig}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 12, right: 16, bottom: 12, left: 16 }}
      >
        <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
        <YAxis
          dataKey="label"
          type="category"
          width={160}
          axisLine={false}
          tickLine={false}
          label={{
            value: "Faixa de preço",
            angle: -90,
            position: "insideLeft",
            offset: -10,
            style: { fill: "#475569", fontSize: "0.75rem" },
          }}
        />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatValue(Number(value))}
          label={{
            value: "Total de buscas",
            position: "insideBottom",
            offset: -4,
            style: { fill: "#475569", fontSize: "0.75rem" },
          }}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--foreground) / 0.04)" }}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(label) => String(label)}
              formatter={(value) => formatValue(Number(value))}
            />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 6, 6, 0]}
          maxBarSize={38}
        />
      </BarChart>
    </ChartContainer>
  );
}
