const SECONDS_PER = { day: 86_400, hour: 3_600, minute: 60 } as const;
const ISO_DURATION_PATTERN = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const VIDEO_ID_PATTERN = /^[\w-]{11}$/;
const VIDEO_URL_PATTERNS = [/[?&]v=([\w-]{11})/, /youtu\.be\/([\w-]{11})/, /youtube\.com\/(?:shorts|embed|live|v)\/([\w-]{11})/];

/** Converts a YouTube ISO 8601 duration (PT1H2M3S) to seconds. */
export function parseIsoDuration(iso: string): number | null {
  if (!iso || iso === "P" || iso === "PT") return null;
  const match = ISO_DURATION_PATTERN.exec(iso);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * SECONDS_PER.day +
    Number(hours ?? 0) * SECONDS_PER.hour +
    Number(minutes ?? 0) * SECONDS_PER.minute +
    Number(seconds ?? 0)
  );
}

/** Extracts the 11-char video ID from any YouTube link format (or a bare ID). */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (VIDEO_ID_PATTERN.test(trimmed)) return trimmed;
  for (const pattern of VIDEO_URL_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) return match[1]!;
  }
  return null;
}
