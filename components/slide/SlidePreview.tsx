import { browserFontResolver } from "@/lib/fonts";
import { renderSlide, SLIDE_HEIGHT, SLIDE_WIDTH, type SlideRenderInput } from "@/lib/render/layouts";
import type { Theme } from "@/lib/schemas/carousel.zod";
import { cn } from "@/lib/utils";

const BROWSER_TEXTURES = { grain: "/textures/grain.png" };

export type SlidePreviewProps = {
  slide: SlideRenderInput;
  theme: Theme;
  position: number;
  total: number;
  watermark?: boolean;
  /** Largura em px do preview. */
  width: number;
  className?: string;
  label?: string;
};

/** Slide renderizado com o mesmo layout do export, reduzido por transform. */
export function SlidePreview({ slide, theme, position, total, watermark, width, className, label }: SlidePreviewProps) {
  const scale = width / SLIDE_WIDTH;
  return (
    <div
      role="img"
      aria-label={label ?? `Slide ${position} de ${total}`}
      className={cn("relative shrink-0 overflow-hidden", className)}
      style={{ width, height: Math.round(SLIDE_HEIGHT * scale) }}
    >
      <div
        aria-hidden
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {renderSlide(slide, { theme, position, total, watermark, resolveFont: browserFontResolver, textures: BROWSER_TEXTURES })}
      </div>
    </div>
  );
}
