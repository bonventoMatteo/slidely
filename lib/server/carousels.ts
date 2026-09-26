import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseSlideRow, parseTheme } from "@/lib/schemas/carousel.zod";
import type { Database } from "@/lib/supabase/database.types";

export type CarouselSummary = {
  id: string;
  title: string;
  status: string;
  slideCount: number;
  updatedAt: string;
  projectId: string;
  cover: ReturnType<typeof parseSlideRow> | null;
  theme: ReturnType<typeof parseTheme>;
};

const SELECT = "id, title, status, slide_count, updated_at, project_id, theme, slides(id, position, layout, content, image_url)";

/** Carrosséis com o slide de capa, para cards com miniatura. */
export async function listCarouselSummaries(
  supabase: SupabaseClient<Database>,
  opts: { projectId?: string; limit?: number } = {},
): Promise<CarouselSummary[]> {
  let query = supabase
    .from("carousels")
    .select(SELECT)
    .order("updated_at", { ascending: false })
    .order("position", { referencedTable: "slides" })
    .limit(1, { referencedTable: "slides" });
  if (opts.projectId) query = query.eq("project_id", opts.projectId);
  if (opts.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw new Error(`carousels_query_failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title ?? "Sem título",
    status: row.status,
    slideCount: row.slide_count,
    updatedAt: row.updated_at,
    projectId: row.project_id,
    cover: row.slides[0] ? parseSlideRow(row.slides[0]) : null,
    theme: parseTheme(row.theme),
  }));
}
