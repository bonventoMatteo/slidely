"use client";

import { useSyncExternalStore } from "react";

/**
 * Media query reativa. No servidor (e no primeiro render da hidratação) retorna
 * null, para o chamador decidir o que exibir enquanto não sabe o tamanho da tela.
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
