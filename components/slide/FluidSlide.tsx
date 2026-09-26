"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SlidePreview, type SlidePreviewProps } from "./SlidePreview";

/** SlidePreview que ocupa 100% da largura do container (aspect 4:5). */
export function FluidSlide({ className, ...props }: Omit<SlidePreviewProps, "width">) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // useLayoutEffect mede antes do paint e evita o "piscar" ao remontar.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(Math.floor(el.getBoundingClientRect().width));
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative aspect-[4/5] w-full overflow-hidden", className)}>
      {width > 0 ? <SlidePreview {...props} width={width} className="absolute inset-0" /> : null}
    </div>
  );
}
