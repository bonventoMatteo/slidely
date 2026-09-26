import { Download } from "lucide-react";
import Image from "next/image";
import { LogoMark } from "@/components/shared/Logo";

const DECK = ["capa-real-0", "capa-real-1", "capa-real-2", "capa-real-3", "capa-real-4"];

/** Réplica estática do editor real, com slides renderizados pelo motor do slidely. */
export function EditorMock() {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f0f] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
        {/* Barra superior */}
        <div className="flex h-12 items-center gap-3 border-b border-white/[0.06] px-4">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </div>
          <div className="ml-2 hidden items-center gap-2 sm:flex">
            <LogoMark size={14} bg="#0f0f0f" />
            <span className="text-[13px] text-neutral-300">Onde foi parar o seu salário?</span>
          </div>
          <span className="ml-auto hidden text-xs text-neutral-500 sm:inline">Salvo</span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground">
            <Download className="size-3.5" aria-hidden /> Baixar PNGs
          </span>
        </div>

        <div className="flex">
          {/* Miniaturas */}
          <div className="hidden w-[132px] shrink-0 flex-col gap-3 border-r border-white/[0.06] p-3 md:flex">
            {DECK.map((file, i) => (
              <div key={file} className="flex items-start gap-2">
                <span className="w-3 pt-1 text-[10px] tabular-nums text-neutral-500">{i + 1}</span>
                <div className={`overflow-hidden rounded-md border-2 ${i === 0 ? "border-primary" : "border-transparent"}`}>
                  <Image src={`/showcase/${file}.webp`} alt="" width={88} height={110} className="block" />
                </div>
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex min-w-0 flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.035),transparent_70%)] px-4 py-8 sm:py-10">
            <div className="w-full max-w-[380px] overflow-hidden rounded-lg shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <Image
                src="/showcase/capa-real-0.webp"
                alt="Capa de carrossel gerada pelo slidely: foto real de mãos contando dinheiro e o título “Onde foi parar o seu salário?”"
                width={540}
                height={675}
                priority
                className="block h-auto w-full"
              />
            </div>
          </div>

          {/* Painel */}
          <div className="hidden w-[260px] shrink-0 flex-col gap-5 border-l border-white/[0.06] p-4 lg:flex" aria-hidden>
            <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/[0.04] p-1 text-center text-[11px]">
              {["Texto", "Layout", "Design", "Fotos"].map((tab, i) => (
                <span key={tab} className={`rounded-md py-1.5 ${i === 2 ? "bg-white/10 text-white" : "text-neutral-500"}`}>
                  {tab}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>Tamanho do texto</span>
                <span className="text-neutral-300">110%</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-white/10">
                <div className="absolute inset-y-0 left-0 w-[57%] rounded-full bg-primary" />
                <div className="absolute top-1/2 left-[57%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-[#0f0f0f]" />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-500">Destaque</span>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-0.5 text-center text-[11px]">
                <span className="rounded-md py-1 text-neutral-500">Cor</span>
                <span className="rounded-md bg-white/10 py-1 text-white">Marca-texto</span>
                <span className="rounded-md py-1 text-neutral-500">Sublinhado</span>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-500">Cores da marca</span>
              <div className="flex gap-1.5">
                {["#0f172a", "#fafaf9", "#f59e0b", "#0f172a", "#fafaf9"].map((c, i) => (
                  <span key={i} className="size-7 rounded-md border border-white/15" style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-500">Acabamento</span>
              <div className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-neutral-300">Grão de filme</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
