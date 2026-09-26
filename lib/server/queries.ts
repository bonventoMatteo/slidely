import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanId, planAllows, type PlanId } from "@/lib/plans";
import { parseBrandColors, parseBrandFonts } from "@/lib/schemas/brandkit.zod";
import { templateLayoutSchema } from "@/lib/schemas/carousel.zod";
import type { Database, Tables } from "@/lib/supabase/database.types";
import type { BrandKitOption, CreationOptions, ProjectOption, TemplateOption } from "@/lib/types";

type Client = SupabaseClient<Database>;

export function toBrandKitOption(row: Tables<"brand_kits">): BrandKitOption {
  return {
    id: row.id,
    name: row.name,
    colors: parseBrandColors(row.colors),
    fonts: parseBrandFonts(row.fonts),
    handle: row.handle ?? "",
    logoUrl: row.logo_url,
  };
}

export async function listTemplates(supabase: Client, plan: PlanId): Promise<TemplateOption[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, description, category, required_plan, layout_json")
    .order("sort_order");
  if (error) throw new Error(`templates_query_failed: ${error.message}`);

  return (data ?? []).flatMap((row) => {
    const layout = templateLayoutSchema.safeParse(row.layout_json);
    if (!layout.success) return [];
    const requiredPlan: PlanId = isPlanId(row.required_plan) ? row.required_plan : "free";
    return [
      {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        requiredPlan,
        locked: !planAllows(plan, requiredPlan),
        layout: layout.data,
      },
    ];
  });
}

export async function listBrandKits(supabase: Client): Promise<BrandKitOption[]> {
  const { data, error } = await supabase.from("brand_kits").select("*").order("created_at");
  if (error) throw new Error(`brand_kits_query_failed: ${error.message}`);
  return (data ?? []).map(toBrandKitOption);
}

export async function listProjectOptions(supabase: Client): Promise<ProjectOption[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, niche, brand_kit_id")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`projects_query_failed: ${error.message}`);
  return (data ?? []).map((p) => ({ id: p.id, title: p.title, niche: p.niche, brandKitId: p.brand_kit_id }));
}

export async function getCreationOptions(supabase: Client, plan: PlanId): Promise<CreationOptions> {
  const [templates, brandKits, projects] = await Promise.all([
    listTemplates(supabase, plan),
    listBrandKits(supabase),
    listProjectOptions(supabase),
  ]);
  return { templates, brandKits, projects };
}
