"use client";

import { SlidePreview } from "@/components/slide/SlidePreview";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SAMPLE_TOTAL, sampleDeck } from "@/lib/template-samples";
import type { TemplateOption } from "@/lib/types";

/** Prévia ampliada dos 3 slides de exemplo de um template. */
export function TemplatePreview({
  template,
  open,
  onOpenChange,
  footer,
}: {
  template: TemplateOption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
}) {
  if (!template?.layout.sample) return null;
  const slides = sampleDeck(template.layout, template.layout.sample);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.category} · {template.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {slides.map((slide, i) => (
            <div key={i} className="overflow-hidden rounded-xl ring-1 ring-white/10">
              <SlidePreview
                slide={slide}
                theme={{ ...template.layout.theme, handle: "seuperfil" }}
                position={slide.position}
                total={SAMPLE_TOTAL}
                width={240}
              />
            </div>
          ))}
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
