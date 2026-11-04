"use client";

import { useEffect, useState } from "react";

/**
 * Hook utilitário para responder a `matchMedia` respeitando o ambiente SSR.
 * Retorna `true` apenas após o browser confirmar que a media query está ativa.
 */
export function useMediaQuery(query: string, initialValue = false) {
  const [matches, setMatches] = useState(initialValue);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const update = () => setMatches(mediaQueryList.matches);

    update();

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", update);
    } else {
      mediaQueryList.addListener(update);
    }

    return () => {
      if (typeof mediaQueryList.removeEventListener === "function") {
        mediaQueryList.removeEventListener("change", update);
      } else {
        mediaQueryList.removeListener(update);
      }
    };
  }, [query]);

  return matches;
}
