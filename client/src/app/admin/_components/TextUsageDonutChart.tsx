"use client";

type TextUsageDonutChartProps = {
  withText: number;
  withoutText: number;
  size?: "default" | "compact";
};

const SEGMENTS = [
  { key: "withText", label: "Com texto livre", color: "#f97316" },
  { key: "withoutText", label: "Somente seletores", color: "#38bdf8" },
] as const;

export function TextUsageDonutChart({
  withText,
  withoutText,
  size = "default",
}: TextUsageDonutChartProps) {
  const total = withText + withoutText;
  const isCompact = size === "compact";
  const fallbackHeight = isCompact ? "h-36" : "h-48";
  const donutSize = isCompact ? "h-32 w-32" : "h-40 w-40";
  const centerInset = isCompact ? "inset-[22px]" : "inset-[28px]";
  const totalFont = isCompact ? "text-xl" : "text-2xl";
  const containerGap = isCompact ? "gap-4" : "gap-6";

  if (total === 0) {
    return (
      <div
        className={`flex ${fallbackHeight} items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-muted-foreground`}
      >
        Nenhuma pesquisa registrada até o momento.
      </div>
    );
  }

  const rawSegments = SEGMENTS.map((segment) => ({
    ...segment,
    value: segment.key === "withText" ? withText : withoutText,
  }));

  const gradientStops: string[] = [];
  let currentOffset = 0;

  rawSegments.forEach(({ value, color }) => {
    if (value <= 0) {
      return;
    }
    const percentage = (value / total) * 100;
    const start = currentOffset;
    const end = start + percentage;
    gradientStops.push(`${color} ${start}% ${end}%`);
    currentOffset = end;
  });

  const gradientFill =
    gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(", ")})`
      : "conic-gradient(#e5e7eb 0% 100%)";

  return (
    <div
      className={`flex flex-col items-center ${containerGap} sm:flex-row sm:items-center sm:justify-center`}
    >
      <div className={`relative ${donutSize}`}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundImage: gradientFill }}
        />
        <div className={`absolute ${centerInset} rounded-full bg-white`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${totalFont} font-bold text-[#001428]`}>
            {total}
          </span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            pesquisas
          </span>
        </div>
      </div>

      <ul className="space-y-3 text-sm">
        {rawSegments.map(({ key, label, color, value }) => {
          const percentage =
            total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <li key={key} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-[#001428]">{label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {value} ({percentage}%)
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
