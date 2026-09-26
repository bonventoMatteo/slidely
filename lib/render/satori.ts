import "server-only";

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import type { Theme } from "@/lib/schemas/carousel.zod";
import { loadFonts } from "./fonts";
import { loadGrain } from "./textures";
import { renderSlide, SLIDE_HEIGHT, SLIDE_WIDTH, type SlideRenderInput } from "./layouts";

const IMAGE_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/svg+xml"]);

/** Hosts de imagem permitidos no render (proteção contra SSRF). */
const EXTRA_IMAGE_HOSTS = new Set(["images.pexels.com"]);

function allowedImageHost(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  if (EXTRA_IMAGE_HOSTS.has(url.host)) return true;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  try {
    return url.host === new URL(supabaseUrl).host;
  } catch {
    return false;
  }
}

/**
 * Baixa a imagem e devolve data URI. Só aceita arquivos do Storage do próprio
 * projeto Supabase (evita SSRF) e ignora imagens inválidas em vez de quebrar o export.
 */
export async function inlineImage(src: string | null | undefined): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:image/")) return src;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (!allowedImageHost(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(type)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Satori → PNG via `next/og` (Satori + resvg em WebAssembly, embutidos no Next).
 * Sem binário nativo: roda igual em dev, `next start` e Vercel.
 */
export async function elementToPng(element: ReactElement, origin: string | null = null): Promise<Buffer> {
  const fonts = await loadFonts(origin);
  const response = new ImageResponse(element, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    fonts,
    emoji: "twemoji",
  });
  return Buffer.from(await response.arrayBuffer());
}

export type RenderCarouselInput = {
  slides: SlideRenderInput[];
  theme: Theme;
  watermark: boolean;
  /** Origem do próprio site (fallback para baixar as fontes de /fonts). */
  origin?: string | null;
};

/** Renderiza todos os slides em PNG (1080×1350), na ordem recebida. */
export async function renderCarouselPngs({ slides, theme, watermark, origin = null }: RenderCarouselInput): Promise<Buffer[]> {
  const [logoUrl, grain] = await Promise.all([
    inlineImage(theme.logoUrl),
    theme.texture === "grain" ? loadGrain(origin) : Promise.resolve(undefined),
  ]);
  const resolvedTheme: Theme = { ...theme, logoUrl };
  const total = slides.length;
  const images = await Promise.all(slides.map((slide) => inlineImage(slide.image_url)));

  const pngs: Buffer[] = [];
  for (const [index, slide] of slides.entries()) {
    const element = renderSlide(
      { ...slide, image_url: images[index] },
      { theme: resolvedTheme, position: index + 1, total, watermark, textures: { grain } },
    );
    pngs.push(await elementToPng(element, origin));
  }
  return pngs;
}
