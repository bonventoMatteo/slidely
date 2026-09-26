import type { FontFamily } from "@/lib/schemas/brandkit.zod";

/** Arquivos TTF em public/fonts (Satori exige fontes estáticas, não variáveis). */
export const FONT_FILES: Record<FontFamily, { weight: 400 | 700 | 900; file: string }[]> = {
  Inter: [
    { weight: 400, file: "Inter-Regular.ttf" },
    { weight: 700, file: "Inter-Bold.ttf" },
    { weight: 900, file: "Inter-Black.ttf" },
  ],
  Montserrat: [
    { weight: 400, file: "Montserrat-Regular.ttf" },
    { weight: 700, file: "Montserrat-Bold.ttf" },
    { weight: 900, file: "Montserrat-Black.ttf" },
  ],
  "Playfair Display": [
    { weight: 400, file: "PlayfairDisplay-Regular.ttf" },
    { weight: 700, file: "PlayfairDisplay-Bold.ttf" },
    { weight: 900, file: "PlayfairDisplay-Black.ttf" },
  ],
  "Space Grotesk": [
    { weight: 400, file: "SpaceGrotesk-Regular.ttf" },
    { weight: 700, file: "SpaceGrotesk-Bold.ttf" },
  ],
};

export type FontResolver = (family: FontFamily) => string;

/** No servidor (Satori) o nome da família é usado diretamente. */
export const serverFontResolver: FontResolver = (family) => family;
