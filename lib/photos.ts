import "server-only";

import { z } from "zod";
import { ApiError } from "@/lib/api";

/** Foto de banco de imagens pronta para uso num slide. */
export type StockPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  /** Retrato ~1080px de largura, para o slide. */
  url: string;
  thumb: string;
  avgColor: string | null;
};

const pexelsPhoto = z.object({
  id: z.number(),
  alt: z.string().nullish(),
  url: z.string(),
  photographer: z.string(),
  photographer_url: z.string(),
  avg_color: z.string().nullish(),
  src: z.object({ original: z.string(), large2x: z.string(), medium: z.string(), portrait: z.string() }),
});
const pexelsSearch = z.object({ photos: z.array(pexelsPhoto), total_results: z.number().optional() });

export function photosEnabled(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/** Busca fotos no Pexels (licença livre para uso comercial). */
export async function searchPhotos(query: string, opts: { page?: number; perPage?: number } = {}): Promise<StockPhoto[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new ApiError(501, "photos_disabled", "Banco de fotos não configurado (PEXELS_API_KEY).");

  const params = new URLSearchParams({
    query,
    orientation: "portrait",
    size: "large",
    per_page: String(opts.perPage ?? 24),
    page: String(opts.page ?? 1),
  });
  let res: Response;
  try {
    res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError(502, "photos_unreachable", "Não foi possível falar com o banco de fotos.");
  }
  if (res.status === 429) throw new ApiError(503, "photos_rate_limited", "Limite do banco de fotos atingido. Tente em instantes.");
  if (!res.ok) throw new ApiError(502, "photos_error", `Banco de fotos respondeu ${res.status}.`);

  const parsed = pexelsSearch.safeParse(await res.json());
  if (!parsed.success) throw new ApiError(502, "photos_error", "Resposta inesperada do banco de fotos.");

  return parsed.data.photos.map((p) => ({
    id: p.id,
    alt: p.alt ?? "",
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    pageUrl: p.url,
    // Recorte retrato 1080×1350 servido pelo CDN do Pexels (parâmetros oficiais de redimensionamento).
    url: `${p.src.original}?auto=compress&cs=tinysrgb&fit=crop&w=1080&h=1350`,
    thumb: p.src.medium,
    avgColor: p.avg_color ?? null,
  }));
}

/** Primeira foto da busca, ou null (nunca lança — usado na geração automática). */
export async function firstPhoto(query: string): Promise<StockPhoto | null> {
  if (!photosEnabled() || !query.trim()) return null;
  try {
    const [photo] = await searchPhotos(query, { perPage: 3 });
    return photo ?? null;
  } catch {
    return null;
  }
}
