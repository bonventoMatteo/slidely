import { z } from "zod";
import {
  brandColorsSchema,
  brandFontsSchema,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_FONTS,
  fontFamilySchema,
  hexColorSchema,
} from "./brandkit.zod";

export const LAYOUT_IDS = [
  "bold-hook",
  "split",
  "numbered",
  "quote",
  "cta-strong",
  "minimal",
  "editorial",
  "tweet",
  "magazine",
  "checklist",
  "big-stat",
  "glass",
  "brutal",
  "photo-cover",
  "photo-split",
] as const;
export const layoutIdSchema = z.enum(LAYOUT_IDS);
export type LayoutId = z.infer<typeof layoutIdSchema>;

/** 'default' = escolhe o layout pelo papel do slide. */
export const slideLayoutSchema = z.union([layoutIdSchema, z.literal("default")]);
export type SlideLayout = z.infer<typeof slideLayoutSchema>;

export const DECORATIONS = ["none", "dots", "grid", "glow", "frame"] as const;
export const decorationSchema = z.enum(DECORATIONS);
export type Decoration = z.infer<typeof decorationSchema>;

export const slideRoleSchema = z.enum(["hook", "content", "cta"]);
export type SlideRole = z.infer<typeof slideRoleSchema>;

/** Natureza do conteúdo do slide — o template escolhe o layout ideal para cada uma. */
export const SLIDE_FORMATS = ["text", "list", "stat", "quote"] as const;
export const slideFormatSchema = z.enum(SLIDE_FORMATS);
export type SlideFormat = z.infer<typeof slideFormatSchema>;

/** Como palavras marcadas com **destaque** aparecem. */
export const TEXTURES = ["none", "grain"] as const;
export const textureSchema = z.enum(TEXTURES);
export type Texture = z.infer<typeof textureSchema>;

export const HIGHLIGHTS = ["color", "marker", "underline"] as const;
export const highlightSchema = z.enum(HIGHLIGHTS);
export type Highlight = z.infer<typeof highlightSchema>;

export const themeSchema = z.object({
  colors: brandColorsSchema,
  fonts: brandFontsSchema,
  handle: z.string().max(31).default(""),
  logoUrl: z.url().nullable().default(null),
  decoration: decorationSchema.default("none"),
  highlight: highlightSchema.default("color"),
  /** Grão de filme sobre o fundo (tira o aspecto "digital liso"). */
  texture: textureSchema.default("none"),
  /** Nome exibido (layout estilo post). Vem do brand kit. */
  brandName: z.string().max(60).default(""),
});
export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  colors: DEFAULT_BRAND_COLORS,
  fonts: DEFAULT_BRAND_FONTS,
  handle: "",
  logoUrl: null,
  decoration: "none",
  highlight: "color",
  texture: "none",
  brandName: "",
};

export function parseTheme(value: unknown): Theme {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

const optionalText = (max: number) => z.string().max(max).optional();

export const slideContentSchema = z.object({
  role: slideRoleSchema.default("content"),
  hook: optionalText(200),
  title: z.string().max(200).default(""),
  body: z.string().max(1200).default(""),
  cta: optionalText(200),
  visual_hint: optionalText(300),
  /** Rótulo curto acima do título ("Passo 2", "Erro #3"). */
  kicker: optionalText(40),
  format: slideFormatSchema.optional(),
  /** Número em destaque para slides de dado ("36%", "R$ 1,1 bi"). */
  stat: optionalText(24),
  /** Busca de foto (inglês) sugerida pela IA para o banco de imagens. */
  photo_query: optionalText(100),
  /** Ajustes de design por slide. */
  textScale: z.number().min(0.7).max(1.4).optional(),
  align: z.enum(["left", "center"]).optional(),
  vAlign: z.enum(["top", "center", "bottom"]).optional(),
  /** Intensidade do escurecimento sobre fotos (0–1). */
  overlay: z.number().min(0).max(1).optional(),
  bgOverride: hexColorSchema.optional(),
  textColorOverride: hexColorSchema.optional(),
  headingFontOverride: fontFamilySchema.optional(),
});
export type SlideContent = z.infer<typeof slideContentSchema>;

export const editorSlideSchema = z.object({
  id: z.uuid(),
  position: z.number().int().min(1).max(20),
  layout: slideLayoutSchema,
  content: slideContentSchema,
  image_url: z.url().nullable(),
});
export type EditorSlide = z.infer<typeof editorSlideSchema>;

/** Converte linhas do banco (jsonb com possíveis nulls) em slides válidos. */
export function parseSlideRow(row: {
  id: string;
  position: number;
  layout: string;
  content: unknown;
  image_url: string | null;
}): EditorSlide {
  const rawContent =
    row.content && typeof row.content === "object"
      ? Object.fromEntries(
          Object.entries(row.content as Record<string, unknown>).filter(([, v]) => v !== null),
        )
      : {};
  const content = slideContentSchema.safeParse(rawContent);
  const layout = slideLayoutSchema.safeParse(row.layout);
  return {
    id: row.id,
    position: row.position,
    layout: layout.success ? layout.data : "default",
    content: content.success ? content.data : { role: "content", title: "", body: "" },
    image_url: row.image_url,
  };
}

export const templateSequenceSchema = z.object({
  first: layoutIdSchema,
  middle: z.array(layoutIdSchema).min(1),
  penultimate: layoutIdSchema.optional(),
  last: layoutIdSchema,
});
export type TemplateSequence = z.infer<typeof templateSequenceSchema>;

export const templateSampleSchema = z.object({
  hook: z.string(),
  title: z.string(),
  body: z.string(),
  cta: z.string(),
  kicker: z.string().optional(),
  stat: z.object({ value: z.string(), label: z.string(), body: z.string().optional() }).optional(),
  list: z.object({ title: z.string(), items: z.array(z.string()).min(2).max(6) }).optional(),
  /** Fotos de exemplo (CDN do Pexels) para a prévia: capa e slide com foto. */
  photo: z.url().optional(),
  photo2: z.url().optional(),
});

/** Layout por formato de conteúdo (sobrepõe a sequência nos slides do meio). */
export const templateFormatsSchema = z.object({
  list: layoutIdSchema.optional(),
  stat: layoutIdSchema.optional(),
  quote: layoutIdSchema.optional(),
});
export type TemplateFormats = z.infer<typeof templateFormatsSchema>;

export const DEFAULT_FORMATS: TemplateFormats = { list: "checklist", stat: "big-stat" };

export const templateLayoutSchema = z.object({
  sequence: templateSequenceSchema,
  formats: templateFormatsSchema.optional(),
  collection: z.enum(["essenciais", "pro"]).default("essenciais"),
  theme: themeSchema,
  niche: z.string().optional(),
  sample: templateSampleSchema.optional(),
});
export type TemplateLayout = z.infer<typeof templateLayoutSchema>;

export const DEFAULT_SEQUENCE: TemplateSequence = {
  first: "bold-hook",
  middle: ["numbered"],
  penultimate: "quote",
  last: "cta-strong",
};

/** Layout para a posição (1-based) de um carrossel com `total` slides. */
export function layoutForPosition(
  sequence: TemplateSequence,
  position: number,
  total: number,
): LayoutId {
  if (position === 1) return sequence.first;
  if (position === total) return sequence.last;
  if (position === total - 1 && sequence.penultimate && total > 3) return sequence.penultimate;
  return sequence.middle[(position - 2) % sequence.middle.length];
}

/** Layout de um slide gerado: capa e CTA pela sequência; no meio, o formato do conteúdo tem prioridade. */
export function layoutForSlide(
  template: Pick<TemplateLayout, "sequence" | "formats"> | null,
  position: number,
  total: number,
  format: SlideFormat | undefined,
): LayoutId {
  const sequence = template?.sequence ?? DEFAULT_SEQUENCE;
  if (position > 1 && position < total && format && format !== "text") {
    const formats = { ...DEFAULT_FORMATS, ...template?.formats };
    const byFormat = formats[format];
    if (byFormat) return byFormat;
  }
  return layoutForPosition(sequence, position, total);
}

/** Layout efetivo de um slide com layout 'default'. */
export function resolveLayout(layout: SlideLayout, role: SlideRole, position: number, total: number): LayoutId {
  if (layout !== "default") return layout;
  if (role === "hook") return "bold-hook";
  if (role === "cta") return "cta-strong";
  return layoutForPosition(DEFAULT_SEQUENCE, position, total);
}

export const renderRequestSchema = z.object({
  carouselId: z.uuid(),
  format: z.enum(["png", "pdf", "zip"]),
});
export type RenderRequest = z.infer<typeof renderRequestSchema>;

export const themeUpdateSchema = z.object({ theme: themeSchema });
