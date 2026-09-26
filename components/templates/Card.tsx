"use client";

import { Eye, Lock } from "lucide-react";
import { FluidSlide } from "@/components/slide/FluidSlide";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_TOTAL, sampleDeck } from "@/lib/template-samples";
import type { TemplateOption } from "@/lib/types";

export function TemplateCard({
  template,
  onUse,
  onPreview,
}: {
  template: TemplateOption;
  onUse: () => void;
  onPreview: () => void;
}) {
  const sample = template.layout.sample;
  const deck = sample ? sampleDeck(template.layout, sample) : [];
  const cover = deck[0];
  const content = deck.find((s) => s.content.format === "list" || s.content.format === "stat") ?? deck[1];
  const theme = { ...template.layout.theme, handle: "seuperfil" };

  return (
    <li className="group flex flex-col">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card">
        <div className="grid grid-cols-2 gap-px bg-white/10">
          {cover ? <FluidSlide slide={cover} theme={theme} position={1} total={SAMPLE_TOTAL} label={`${template.name}: capa`} /> : null}
          {content ? <FluidSlide slide={content} theme={theme} position={content.position} total={SAMPLE_TOTAL} label={`${template.name}: conteúdo`} /> : null}
        </div>
        {template.layout.collection === "pro" && !template.locked ? (
          <Badge className="bg-gradient-brand absolute left-3 top-3 text-brand-dark">Pro</Badge>
        ) : null}
        {template.locked ? (
          <Badge className="absolute left-3 top-3 gap-1 bg-black/70 text-white backdrop-blur">
            <Lock className="size-3" aria-hidden /> Business
          </Badge>
        ) : null}
        <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Button type="button" size="sm" variant="secondary" onClick={onPreview}>
            <Eye aria-hidden /> Prévia
          </Button>
          <Button type="button" size="sm" onClick={onUse}>
            {template.locked ? "Desbloquear" : "Usar template"}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{template.name}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{template.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground">{template.category}</span>
      </div>
      {/* Ações sempre visíveis em telas touch */}
      <div className="mt-2 flex gap-2 sm:hidden">
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onPreview}>
          Prévia
        </Button>
        <Button type="button" size="sm" className="flex-1" onClick={onUse}>
          {template.locked ? "Desbloquear" : "Usar"}
        </Button>
      </div>
    </li>
  );
}
