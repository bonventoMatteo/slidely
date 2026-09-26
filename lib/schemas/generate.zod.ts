import { z } from "zod";

export const TONES = [
  "profissional",
  "descontraído",
  "inspirador",
  "educativo",
  "provocativo",
  "técnico",
  "bem-humorado",
] as const;
export const toneSchema = z.enum(TONES);
export type Tone = z.infer<typeof toneSchema>;

export const MIN_SLIDES = 3;
export const MAX_SLIDES = 15;

const optionalUuid = z.uuid().nullish();

export const generateRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, "Descreva o tema com pelo menos 3 caracteres")
    .max(8000, "Máximo de 8000 caracteres"),
  tone: toneSchema.default("profissional"),
  slideCount: z.number().int().min(MIN_SLIDES).max(MAX_SLIDES).default(7),
  niche: z.string().trim().min(2, "Informe o nicho").max(80),
  sourceUrl: z.url({ protocol: /^https?$/ }).max(2048).nullish(),
  brandKitId: optionalUuid,
  projectId: optionalUuid,
  templateId: optionalUuid,
});
export type GenerateRequest = z.input<typeof generateRequestSchema>;

export const regenerateSlideRequestSchema = z.object({
  carouselId: z.uuid(),
  slideId: z.uuid(),
  instruction: z.string().trim().max(300).optional(),
});

/** Saída esperada do Claude. Campos opcionais aceitam null (o modelo às vezes emite null). */
const nullableText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

export const generatedSlideSchema = z.object({
  position: z.number().int().min(1),
  role: z.enum(["hook", "content", "cta"]),
  hook: nullableText,
  title: z.string().trim().max(200),
  body: z.string().trim().max(1200).default(""),
  cta: nullableText,
  visual_hint: nullableText,
  kicker: nullableText.pipe(z.string().max(40).optional()),
  format: z.enum(["text", "list", "stat", "quote"]).nullish().transform((v) => v ?? "text"),
  stat: nullableText.pipe(z.string().max(24).optional()),
  photo_query: nullableText.pipe(z.string().max(100).optional()),
});
export type GeneratedSlide = z.infer<typeof generatedSlideSchema>;

export const generatedCarouselSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slides: z.array(generatedSlideSchema).min(MIN_SLIDES).max(MAX_SLIDES),
});
export type GeneratedCarousel = z.infer<typeof generatedCarouselSchema>;
