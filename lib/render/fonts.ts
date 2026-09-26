import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FontFamily } from "@/lib/schemas/brandkit.zod";
import { FONT_FILES } from "./font-families";

/** Fonte no formato aceito pelo Satori/ImageResponse. */
export type RenderFont = {
  name: FontFamily;
  weight: 400 | 700 | 900;
  style: "normal";
  data: ArrayBuffer;
};

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");

let cached: Promise<RenderFont[]> | null = null;

function toArrayBuffer(buf: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

/**
 * Lê do disco (arquivos incluídos no bundle via outputFileTracingIncludes) e,
 * se não estiverem lá, baixa do próprio site em /fonts/ — sempre servido pelo CDN.
 */
async function loadFile(file: string, origin: string | null): Promise<ArrayBuffer> {
  try {
    return toArrayBuffer(await readFile(path.join(FONTS_DIR, file)));
  } catch (fsError) {
    if (!origin) throw fsError;
    const res = await fetch(`${origin}/fonts/${file}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`font_fetch_failed ${file}: HTTP ${res.status}`);
    return res.arrayBuffer();
  }
}

/** Carrega todas as fontes uma vez por instância. `origin` habilita o fallback via HTTP. */
export function loadFonts(origin: string | null = null): Promise<RenderFont[]> {
  if (!cached) {
    cached = Promise.all(
      (Object.entries(FONT_FILES) as [FontFamily, (typeof FONT_FILES)[FontFamily]][]).flatMap(([name, files]) =>
        files.map(async ({ weight, file }) => ({
          name,
          weight,
          style: "normal" as const,
          data: await loadFile(file, origin),
        })),
      ),
    ).catch((err: unknown) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
