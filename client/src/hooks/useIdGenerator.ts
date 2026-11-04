import { useRef, useCallback } from "react";

export function useIdGenerator(prefix = "id") {
  const counter = useRef(0);
  const instancePrefix = useRef(
    `${prefix}-${Math.random().toString(36).slice(2, 7)}`
  );

  const generateId = useCallback(() => {
    counter.current += 1;
    return `${instancePrefix.current}-${counter.current}`;
  }, []);

  return generateId;
}
