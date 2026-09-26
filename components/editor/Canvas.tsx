"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { SlidePreview } from "@/components/slide/SlidePreview";
import { Button } from "@/components/ui/button";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/render/layouts";
import { useEditor } from "@/lib/stores/editor.store";
import { useEditorMeta } from "./EditorContext";

/** Slide atual em tamanho real reduzido para caber na área central. */
export function Canvas({ compact = false }: { compact?: boolean }) {
  const slides = useEditor((s) => s.slides);
  const theme = useEditor((s) => s.theme);
  const index = useEditor((s) => s.currentIndex);
  const select = useEditor((s) => s.select);
  const { watermark } = useEditorMeta();
  const reduce = useReducedMotion();

  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Direção da transição derivada do índice anterior (setState durante o render é suportado).
  const [prevIndex, setPrevIndex] = useState(index);
  const [direction, setDirection] = useState(1);
  if (prevIndex !== index) {
    setDirection(index > prevIndex ? 1 : -1);
    setPrevIndex(index);
  }

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      const byHeight = (h - 24) * (SLIDE_WIDTH / SLIDE_HEIGHT);
      setWidth(Math.max(160, Math.floor(Math.min(w - (compact ? 32 : 48), byHeight, 640))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [compact]);

  const slide = slides[index];

  return (
    <section aria-label="Pré-visualização" className="relative flex min-w-0 flex-1 flex-col bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_70%)]">
      <div ref={ref} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {slide && width > 0 ? (
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              initial={reduce ? false : { opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              // Deslizar para trocar de slide (toque no celular, arrasto no desktop).
              drag="x"
              dragSnapToOrigin
              dragElastic={0.18}
              dragMomentum={false}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60 || info.velocity.x < -450) select(index + 1);
                else if (info.offset.x > 60 || info.velocity.x > 450) select(index - 1);
              }}
              className="cursor-grab touch-pan-y overflow-hidden rounded-xl shadow-2xl shadow-black/50 ring-1 ring-white/10 active:cursor-grabbing"
            >
              <SlidePreview
                slide={slide}
                theme={theme}
                position={index + 1}
                total={slides.length}
                width={width}
                watermark={watermark}
              />
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>
      <div className={`flex items-center justify-center gap-3 ${compact ? "pb-2" : "pb-4"}`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => select(index - 1)}
          disabled={index === 0}
          aria-label="Slide anterior"
        >
          <ChevronLeft aria-hidden />
        </Button>
        <span className="min-w-16 text-center text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {index + 1} / {slides.length}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => select(index + 1)}
          disabled={index === slides.length - 1}
          aria-label="Próximo slide"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </section>
  );
}
