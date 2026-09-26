import Image from "next/image";
import manifest from "@/public/showcase/manifest.json";

type Item = (typeof manifest)[number];

function Row({ items, reverse, duration }: { items: Item[]; reverse?: boolean; duration: number }) {
  // Duplicado para o loop contínuo (a animação translada -50%).
  const loop = [...items, ...items];
  return (
    <div className="marquee flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <ul
        className="marquee-track flex shrink-0 gap-4 pr-4"
        data-reverse={reverse ? "true" : "false"}
        style={{ ["--marquee-duration" as string]: `${duration}s` }}
      >
        {loop.map((item, i) => (
          <li key={`${item.file}-${i}`} className="w-[216px] shrink-0 sm:w-[252px]" aria-hidden={i >= items.length}>
            <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
              <Image
                src={`/showcase/${item.file}`}
                alt={i < items.length ? `Slide do template ${item.template}` : ""}
                width={540}
                height={675}
                className="block h-auto w-full"
                sizes="252px"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Duas faixas contínuas de slides reais dos templates. */
export function ShowcaseMarquee() {
  const items = manifest.filter((m) => !m.file.startsWith("capa-real-") || m.file === "capa-real-0.webp");
  const half = Math.ceil(items.length / 2);
  return (
    <div className="flex flex-col gap-4">
      <Row items={items.slice(0, half)} duration={80} />
      <Row items={items.slice(half)} duration={90} reverse />
    </div>
  );
}
