import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: Promise<string | undefined> | null = null;

/** Grão de filme como data URI (Satori não busca URLs relativas). Falha → sem textura. */
export function loadGrain(origin: string | null): Promise<string | undefined> {
  if (!cached) {
    cached = (async () => {
      try {
        const buf = await readFile(path.join(process.cwd(), "public", "textures", "grain.png"));
        return `data:image/png;base64,${buf.toString("base64")}`;
      } catch {
        if (!origin) return undefined;
        try {
          const res = await fetch(`${origin}/textures/grain.png`, { signal: AbortSignal.timeout(6000) });
          if (!res.ok) return undefined;
          return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
        } catch {
          return undefined;
        }
      }
    })();
  }
  return cached;
}
