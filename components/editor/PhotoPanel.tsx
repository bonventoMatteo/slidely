"use client";

import { ImageOff, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveLayout, type LayoutId } from "@/lib/schemas/carousel.zod";
import { useEditor } from "@/lib/stores/editor.store";

type Photo = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pageUrl: string;
  url: string;
  thumb: string;
  avgColor: string | null;
};

/** Layouts que exibem a foto do slide. */
const PHOTO_LAYOUTS = new Set<LayoutId>(["bold-hook", "photo-cover", "photo-split", "editorial", "tweet"]);

export function PhotoPanel() {
  const slide = useEditor((s) => s.slides[s.currentIndex]);
  const index = useEditor((s) => s.currentIndex);
  const total = useEditor((s) => s.slides.length);
  const setImage = useEditor((s) => s.setImage);
  const setLayout = useEditor((s) => s.setLayout);
  const [query, setQuery] = useState(slide?.content.photo_query ?? slide?.content.visual_hint ?? "");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/photos?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as { enabled?: boolean; photos?: Photo[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha na busca de fotos.");
      setEnabled(data.enabled !== false);
      setPhotos(data.photos ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na busca de fotos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca inicial com a sugestão da IA para o slide.
  useEffect(() => {
    const initial = slide?.content.photo_query ?? slide?.content.visual_hint;
    if (initial) {
      setQuery(initial);
      void search(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao trocar de slide
  }, [slide?.id]);

  if (!slide) return null;

  function apply(photo: Photo) {
    if (!slide) return;
    setImage(slide.id, photo.url);
    const current = resolveLayout(slide.layout, slide.content.role, index + 1, total);
    if (!PHOTO_LAYOUTS.has(current)) {
      const next: LayoutId = slide.content.role === "content" ? "photo-split" : "photo-cover";
      setLayout(slide.id, next);
      toast.success(`Foto aplicada. Layout trocado para “${next === "photo-split" ? "Foto + texto" : "Foto cheia"}”.`);
    } else {
      toast.success("Foto aplicada.");
    }
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-white/15 p-6 text-center">
        <ImageOff className="size-8 text-muted-foreground" aria-hidden />
        <p className="mt-3 text-sm font-medium">Banco de fotos desligado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Configure a variável PEXELS_API_KEY (grátis em pexels.com/api) para buscar fotos profissionais aqui. Você ainda pode
          enviar a sua na aba Design.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: pessoa trabalhando no café" aria-label="Buscar fotos" />
        <Button type="submit" size="icon" variant="secondary" aria-label="Buscar" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">Dica: buscas em inglês trazem mais resultados.</p>
      {photos.length === 0 && !loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Busque um tema para ver fotos.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => apply(photo)}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-lg border-2 border-transparent hover:border-primary focus-visible:border-primary focus-visible:outline-none"
                style={{ backgroundColor: photo.avgColor ?? "#1a1a1a" }}
                aria-label={`Usar foto: ${photo.alt || "sem descrição"}, de ${photo.photographer}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- miniaturas remotas do Pexels */}
                <img src={photo.thumb} alt="" loading="lazy" className="size-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-left text-[10px] text-white/90">
                  {photo.photographer}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">
        Fotos por{" "}
        <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline">
          Pexels
        </a>
        , licença livre para uso comercial.
      </p>
    </div>
  );
}
