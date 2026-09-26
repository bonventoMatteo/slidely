import type { SlideRenderInput } from "@/lib/render/layouts";
import { layoutForSlide, type SlideFormat, type TemplateLayout } from "@/lib/schemas/carousel.zod";
import type { TemplateSample } from "@/lib/templates-catalog";

export type SampleSlide = SlideRenderInput & { position: number };

/** Total "fictício" da prévia (a numeração dos slides aparece como 01/07…). */
export const SAMPLE_TOTAL = 7;

/**
 * Mini-carrossel de amostra do template: capa, conteúdo, dado e lista (quando
 * o template tem essas amostras) e CTA — cada um no layout que o template usaria.
 */
export function sampleDeck(layout: TemplateLayout, sample: TemplateSample): SampleSlide[] {
  const slide = (position: number, format: SlideFormat, content: SlideRenderInput["content"]): SampleSlide => {
    const chosen = layoutForSlide(layout, position, SAMPLE_TOTAL, format);
    const photo = position === 1 ? sample.photo : chosen === "photo-split" || chosen === "photo-cover" ? (sample.photo2 ?? sample.photo) : undefined;
    return { position, layout: chosen, content: { ...content, format }, image_url: photo ?? null };
  };

  const deck: SampleSlide[] = [
    slide(1, "text", { role: "hook", hook: sample.hook, title: sample.hook, body: "", kicker: sample.kicker }),
    slide(2, "text", { role: "content", title: sample.title, body: sample.body, kicker: sample.kicker ? "Parte 1" : undefined }),
  ];
  if (sample.stat) {
    deck.push(
      slide(3, "stat", {
        role: "content",
        title: sample.stat.label,
        body: sample.stat.body ?? "",
        stat: sample.stat.value,
        kicker: "Dado",
      }),
    );
  }
  if (sample.list) {
    deck.push(
      slide(deck.length + 1, "list", {
        role: "content",
        title: sample.list.title,
        body: sample.list.items.map((i) => (i.startsWith("- ") ? i : `- ${i}`)).join("\n"),
        kicker: "Checklist",
      }),
    );
  }
  deck.push(slide(SAMPLE_TOTAL, "text", { role: "cta", title: sample.cta, cta: sample.cta, body: "" }));
  return deck;
}
