import { parseBrandColors, parseBrandFonts } from "@/lib/schemas/brandkit.zod";
import { DEFAULT_THEME, type TemplateLayout, type Theme } from "@/lib/schemas/carousel.zod";
import type { Tables } from "@/lib/supabase/database.types";

/**
 * Tema do carrossel: parte do template (decoração, paleta padrão) e aplica o
 * brand kit por cima (cores, fontes, @ e logo), quando houver.
 */
export function buildTheme(
  template: TemplateLayout | null,
  brandKit: Pick<Tables<"brand_kits">, "name" | "colors" | "fonts" | "handle" | "logo_url"> | null,
): Theme {
  const base: Theme = template ? template.theme : DEFAULT_THEME;
  if (!brandKit) return base;
  return {
    ...base,
    colors: parseBrandColors(brandKit.colors),
    fonts: parseBrandFonts(brandKit.fonts),
    handle: brandKit.handle ?? "",
    logoUrl: brandKit.logo_url,
    brandName: brandKit.name,
  };
}
