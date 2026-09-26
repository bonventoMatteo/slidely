"use client";

import { Check } from "lucide-react";
import { toast } from "sonner";
import { SlidePreview } from "@/components/slide/SlidePreview";
import { Button } from "@/components/ui/button";
import { LAYOUT_META } from "@/lib/render/layouts";
import { LAYOUT_IDS, resolveLayout, type LayoutId } from "@/lib/schemas/carousel.zod";
import { useEditor } from "@/lib/stores/editor.store";
import { cn } from "@/lib/utils";

const THUMB = 128;

export function LayoutPicker() {
  const slide = useEditor((s) => s.slides[s.currentIndex]);
  const index = useEditor((s) => s.currentIndex);
  const total = useEditor((s) => s.slides.length);
  const theme = useEditor((s) => s.theme);
  const setLayout = useEditor((s) => s.setLayout);
  const setLayoutForAll = useEditor((s) => s.setLayoutForAll);

  if (!slide) return null;
  const effective = resolveLayout(slide.layout, slide.content.role, index + 1, total);

  return (
    <div className="space-y-4">
      {(["Pro", "Essenciais"] as const).map((group) => (
        <div key={group} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group}</h3>
          <ul className="grid grid-cols-2 gap-3" role="listbox" aria-label={`Layouts ${group}`}>
            {LAYOUT_IDS.filter((id) => LAYOUT_META[id].group === group).map((id: LayoutId) => {
              const selected = effective === id;
              return (
                <li key={id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => setLayout(slide.id, id)}
                    className={cn(
                      "relative w-full overflow-hidden rounded-lg border-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      selected ? "border-primary" : "border-white/10 hover:border-white/25",
                    )}
                    aria-label={`${LAYOUT_META[id].label}: ${LAYOUT_META[id].description}`}
                  >
                    <SlidePreview slide={{ ...slide, layout: id }} theme={theme} position={index + 1} total={total} width={THUMB} />
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden />
                      </span>
                    ) : null}
                  </button>
                  <p className="mt-1.5 text-xs font-medium">{LAYOUT_META[id].label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="grid gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLayoutForAll(effective, "content");
            toast.success(`Layout “${LAYOUT_META[effective].label}” aplicado aos slides de conteúdo.`);
          }}
        >
          Aplicar a todos os slides de conteúdo
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setLayout(slide.id, "default")}>
          Voltar ao automático
        </Button>
      </div>
    </div>
  );
}
