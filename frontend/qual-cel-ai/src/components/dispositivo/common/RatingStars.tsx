import { Star, StarHalf } from "lucide-react";

type RatingStarsProps = {
  value: number | null;
  iconSize?: string;
  className?: string;
};

export function RatingStars({
  value,
  iconSize = "size-4",
  className,
}: Readonly<RatingStarsProps>) {
  if (value === null || Number.isNaN(value)) {
    return (
      <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`${iconSize} text-muted-foreground`} />
        ))}
      </div>
    );
  }

  const clamped = Math.max(0, Math.min(5, value));

  return (
    <div className={`flex items-center gap-0.5 ${className ?? ""}`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const diff = clamped - index;
        if (diff >= 1) {
          return (
            <Star
              key={index}
              className={`${iconSize} text-amber-500 fill-amber-500`}
            />
          );
        }
        if (diff >= 0.5) {
          return (
            <StarHalf
              key={index}
              className={`${iconSize} text-amber-500 fill-amber-500`}
            />
          );
        }
        return (
          <Star key={index} className={`${iconSize} text-muted-foreground`} />
        );
      })}
    </div>
  );
}
