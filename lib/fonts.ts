import localFont from "next/font/local";
import type { FontResolver } from "@/lib/render/font-families";
import type { FontFamily } from "@/lib/schemas/brandkit.zod";

// Mesmos TTFs usados pelo Satori no export: o canvas do editor bate 1:1 com o PNG.
export const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Inter-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const montserrat = localFont({
  src: [
    { path: "../public/fonts/Montserrat-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Montserrat-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/Montserrat-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export const playfair = localFont({
  src: [
    { path: "../public/fonts/PlayfairDisplay-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/PlayfairDisplay-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/PlayfairDisplay-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

export const spaceGrotesk = localFont({
  src: [
    { path: "../public/fonts/SpaceGrotesk-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/SpaceGrotesk-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  preload: false,
});

export const fontVariables = [inter.variable, montserrat.variable, playfair.variable, spaceGrotesk.variable].join(" ");

const CSS_VARS: Record<FontFamily, string> = {
  Inter: "var(--font-inter)",
  Montserrat: "var(--font-montserrat)",
  "Playfair Display": "var(--font-playfair)",
  "Space Grotesk": "var(--font-space-grotesk)",
};

/** Resolve a família para a variável CSS do next/font no navegador. */
export const browserFontResolver: FontResolver = (family) => CSS_VARS[family];
