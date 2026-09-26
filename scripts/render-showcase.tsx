/**
 * Renderiza slides reais dos templates (mesmo motor do export) para a vitrine da landing.
 * Saída: public/showcase/*.webp (540×675). Uso: pnpm showcase
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderSlide } from "../lib/render/layouts";
import { elementToPng } from "../lib/render/satori";
import { SAMPLE_TOTAL, sampleDeck } from "../lib/template-samples";
import { TEMPLATE_CATALOG } from "../lib/templates-catalog";

/** [template, índices do mini-carrossel de amostra] */
const PICKS: [string, number[]][] = [
  ["Capa Real", [0, 1, 2, 3, 4]],
  ["Manchete", [0, 3]],
  ["Fio", [0, 2]],
  ["Documental", [0, 1]],
  ["Neo Brutal", [0, 2]],
  ["Suíço", [2]],
  ["Aurora", [0]],
  ["Studio", [0, 1]],
  ["Signature", [0, 3]],
  ["Luxo", [0]],
  ["Consultoria", [0]],
  ["Pastel", [2]],
];

const OUT = path.join(process.cwd(), "public", "showcase");
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");

async function fetchAsDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`foto ${url}: HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const grain = `data:image/png;base64,${readFileSync(path.join(process.cwd(), "public", "textures", "grain.png")).toString("base64")}`;
  const manifest: { file: string; template: string; category: string; position: number }[] = [];

  for (const [name, indexes] of PICKS) {
    const template = TEMPLATE_CATALOG.find((t) => t.name === name);
    if (!template) throw new Error(`template não encontrado: ${name}`);
    const deck = sampleDeck(template.layout, template.sample);
    for (const i of indexes) {
      const slide = deck[i];
      if (!slide) continue;
      const element = renderSlide(
        { ...slide, image_url: await fetchAsDataUri(slide.image_url) },
        {
          theme: { ...template.layout.theme, handle: "seuperfil", brandName: "Seu Perfil" },
          position: slide.position,
          total: SAMPLE_TOTAL,
          textures: { grain },
        },
      );
      const png = await elementToPng(element);
      const file = `${slug(name)}-${i}.webp`;
      writeFileSync(path.join(OUT, file), await sharp(png).resize(540, 675).webp({ quality: 84 }).toBuffer());
      manifest.push({ file, template: name, category: template.category, position: slide.position });
      console.log("✓", file);
    }
  }
  writeFileSync(path.join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`OK: ${manifest.length} slides → public/showcase`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
