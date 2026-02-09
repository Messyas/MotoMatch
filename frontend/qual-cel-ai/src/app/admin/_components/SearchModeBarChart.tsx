"use client";

type SearchModeBarChartProps = {
  data: {
    label: string;
    value: number;
    gradient: string;
  }[];
  valueFormatter?: (value: number) => string;
  size?: "default" | "compact";
};

export function SearchModeBarChart({
  data,
  valueFormatter,
  size = "default",
}: SearchModeBarChartProps) {
  const maxValue = data.reduce(
    (highest, item) => (item.value > highest ? item.value : highest),
    0
  );
  const isCompact = size === "compact";
  const fallbackHeight = isCompact ? "h-36" : "h-48";
  const containerSpacing = isCompact ? "space-y-3" : "space-y-4";

  if (maxValue === 0) {
    return (
      <div
        className={`flex ${fallbackHeight} items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground`}
      >
        Ainda não há dados de interação suficientes.
      </div>
    );
  }

  return (
    <div className={containerSpacing}>
      {data.map((item) => {
        const width = Math.max(6, Math.round((item.value / maxValue) * 100));

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[#001428]">
              <span className="font-medium">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`}
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
