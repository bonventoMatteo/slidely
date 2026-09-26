import { z } from "zod";

export const FONT_FAMILIES = ["Inter", "Montserrat", "Playfair Display", "Space Grotesk"] as const;
export const fontFamilySchema = z.enum(FONT_FAMILIES);
export type FontFamily = z.infer<typeof fontFamilySchema>;

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Aceita #rgb ou #rrggbb e normaliza para #rrggbb minúsculo. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_RE, "Cor inválida (use #RRGGBB)")
  .transform((value) => {
    const hex = value.slice(1).toLowerCase();
    return hex.length === 3
      ? `#${hex
          .split("")
          .map((c) => c + c)
          .join("")}`
      : `#${hex}`;
  });

export const brandColorsSchema = z.object({
  primary: hexColorSchema,
  secondary: hexColorSchema,
  accent: hexColorSchema,
  text: hexColorSchema,
  bg: hexColorSchema,
});
export type BrandColors = z.infer<typeof brandColorsSchema>;

export const brandFontsSchema = z.object({
  heading: fontFamilySchema,
  body: fontFamilySchema,
});
export type BrandFonts = z.infer<typeof brandFontsSchema>;

export const handleSchema = z
  .string()
  .trim()
  .max(31, "Máximo de 30 caracteres")
  .regex(/^@?[A-Za-z0-9._]*$/, "Use apenas letras, números, ponto e underline")
  .transform((value) => value.replace(/^@/, ""));

export const brandKitInputSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(60, "Máximo de 60 caracteres"),
  colors: brandColorsSchema,
  fonts: brandFontsSchema,
  handle: handleSchema.optional(),
  logo_url: z.url().nullable().optional(),
});
export type BrandKitInput = z.input<typeof brandKitInputSchema>;

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: "#0a0a0a",
  secondary: "#ffffff",
  accent: "#ff7a1a",
  text: "#111111",
  bg: "#fafafa",
};

export const DEFAULT_BRAND_FONTS: BrandFonts = { heading: "Inter", body: "Inter" };

/** Lê colunas jsonb do banco com fallback seguro para valores padrão. */
export function parseBrandColors(value: unknown): BrandColors {
  const parsed = brandColorsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_BRAND_COLORS;
}

export function parseBrandFonts(value: unknown): BrandFonts {
  const parsed = brandFontsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_BRAND_FONTS;
}
