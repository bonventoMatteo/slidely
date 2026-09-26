import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { EditorMock } from "@/components/marketing/EditorMock";
import { HeroPrompt } from "@/components/marketing/HeroPrompt";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ShowcaseMarquee } from "@/components/marketing/ShowcaseMarquee";
import { Logo } from "@/components/shared/Logo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatBRL, PLANS, PLAN_IDS } from "@/lib/plans";
import { TEMPLATE_CATALOG } from "@/lib/templates-catalog";
import { cn } from "@/lib/utils";

const TEMPLATE_COUNT = TEMPLATE_CATALOG.length;

const STEPS = [
  {
    title: "Tema ou link",
    text: "Escreva o assunto ou cole o link de uma matéria. O slidely lê o texto e separa o que importa.",
  },
  {
    title: "Roteiro e design",
    text: "Gancho, desenvolvimento e chamada final escritos para reter. Cada slide ganha o layout certo: lista, dado ou citação.",
  },
  {
    title: "Revise e baixe",
    text: "Ajuste texto, cores e foto no editor. Baixe PNG, ZIP ou PDF em 1080×1350, prontos para postar.",
  },
];

const FAQ = [
  {
    q: "Os carrosséis ficam com cara de feito por IA?",
    a: "Não é a proposta. O texto segue regras de copy (sem clichês, frases curtas, números concretos) e o design sai de templates de nível editorial, com fotos reais, textura e a tipografia da sua marca. Você revisa tudo no editor antes de baixar.",
  },
  {
    q: "Posso usar as cores, a fonte e o logo da minha marca?",
    a: "Sim. Crie um brand kit uma vez e ele é aplicado em qualquer carrossel. Dá para ajustar cada slide depois.",
  },
  {
    q: "Funciona com link de notícia ou artigo?",
    a: "Sim. Cole o link de uma matéria pública no campo de tema. O slidely lê o conteúdo e transforma nos pontos principais, sem inventar dados que não estão na fonte.",
  },
  {
    q: "Em que formato os arquivos saem?",
    a: "PNG em 1080×1350 (retrato do Instagram), um ZIP com todos os slides ou PDF para LinkedIn nos planos pagos.",
  },
  {
    q: "Preciso de cartão para testar?",
    a: "Não. O plano grátis tem 5 carrosséis por mês. Se quiser mais, assine quando fizer sentido e cancele quando quiser.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">{children}</p>;
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mt-4 text-[clamp(2rem,4.2vw,3.25rem)] font-bold leading-[1.05] tracking-[-0.04em] text-white", className)}>
      {children}
    </h2>
  );
}

export default function LandingPage() {
  return (
    <div className="relative overflow-x-clip bg-[#0a0a0a] text-neutral-200">
      <MarketingHeader />

      <main id="conteudo">
        {/* HERO */}
        <section className="relative">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,122,26,0.10),transparent_70%)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 sm:px-6 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow>Carrosséis para Instagram e LinkedIn</Eyebrow>
              <h1 className="mt-6 text-[clamp(2.6rem,6.4vw,5rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
                Escreva o tema.
                <br />
                Receba o carrossel <span className="text-primary">pronto</span>.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400 sm:text-xl">
                O slidely escreve o roteiro slide a slide, aplica um design profissional com as cores da sua marca e entrega os
                arquivos prontos para postar.
              </p>
              <HeroPrompt className="mx-auto mt-10 max-w-2xl text-left" />
              <p className="mt-5 text-sm text-neutral-500">5 carrosséis grátis por mês. Sem cartão de crédito.</p>
            </div>
          </div>
          <div className="relative px-5 pb-24 sm:px-6">
            <EditorMock />
          </div>
        </section>

        {/* FATOS */}
        <section aria-label="O que você recebe" className="border-y border-white/[0.06]">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 divide-white/[0.06] px-5 sm:px-6 md:grid-cols-4 md:divide-x">
            {[
              [String(TEMPLATE_COUNT), "templates editoriais"],
              ["1080×1350", "formato retrato do feed"],
              ["PNG · ZIP · PDF", "exportação em 1 clique"],
              ["< 1 min", "do tema ao carrossel"],
            ].map(([value, label]) => (
              <div key={label} className="px-2 py-8 md:px-8">
                <dt className="sr-only">{label}</dt>
                <dd className="text-2xl font-bold tracking-[-0.03em] text-white">{value}</dd>
                <dd className="mt-1 text-sm text-neutral-500">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-16 py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <Eyebrow>Como funciona</Eyebrow>
              <SectionTitle>Três passos. Nenhum deles é abrir o Photoshop.</SectionTitle>
            </div>
            <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-white/10 pt-6">
                  <span className="font-mono text-sm text-primary">0{i + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-neutral-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TEMPLATES */}
        <section id="templates" className="scroll-mt-16 border-t border-white/[0.06] py-28 sm:py-36">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:px-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>Templates</Eyebrow>
              <SectionTitle>Visual de agência, sem contratar agência.</SectionTitle>
              <p className="mt-5 text-lg leading-relaxed text-neutral-400">
                Editorial, post estilo X, suíço, neo brutal, fotografia real. {TEMPLATE_COUNT} templates, todos com a cor e a fonte
                da sua marca.
              </p>
            </div>
            <Link href="/signup" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-white hover:text-primary">
              Ver todos os templates <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-16">
            <ShowcaseMarquee />
          </div>
          <p className="mx-auto mt-8 max-w-6xl px-5 text-sm text-neutral-600 sm:px-6">
            Slides reais gerados na plataforma, sem retoque.
          </p>
        </section>

        {/* RECURSOS */}
        <section className="border-t border-white/[0.06] py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <Eyebrow>Por dentro</Eyebrow>
              <SectionTitle>Feito para quem posta toda semana.</SectionTitle>
            </div>

            <div className="mt-16 grid gap-4 md:grid-cols-6">
              {/* Link → carrossel */}
              <article className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] md:col-span-4">
                <div className="p-8 pb-0">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Cole um link, receba um carrossel</h3>
                  <p className="mt-2 max-w-md leading-relaxed text-neutral-400">
                    Matéria, artigo ou post de blog viram roteiro com os dados da fonte. Nada de número inventado.
                  </p>
                </div>
                <div className="mt-8 flex flex-1 items-end gap-4 px-8">
                  <div className="mb-8 hidden min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-neutral-400 sm:block">
                    <span className="text-neutral-600">https://</span>g1.globo.com/economia/noticia/…
                  </div>
                  <ArrowRight className="mb-11 hidden size-5 shrink-0 text-neutral-600 sm:block" aria-hidden />
                  <div className="flex shrink-0 gap-3">
                    {["documental-0", "documental-1"].map((f) => (
                      <div key={f} className="w-[132px] translate-y-6 overflow-hidden rounded-t-lg ring-1 ring-white/10 sm:w-[150px]">
                        <Image src={`/showcase/${f}.webp`} alt="" width={540} height={675} className="block h-auto w-full" sizes="150px" />
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              {/* Fotos reais */}
              <article className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/[0.08] md:col-span-2">
                <Image
                  src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=900"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 33vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                <div className="relative flex h-full flex-col justify-end p-8">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Fotos reais</h3>
                  <p className="mt-2 leading-relaxed text-neutral-300">Banco de imagens profissional integrado, com licença para uso comercial. Nada de ilustração genérica.</p>
                </div>
              </article>

              {/* Marca */}
              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:col-span-2">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Sua marca, sempre</h3>
                <p className="mt-2 leading-relaxed text-neutral-400">Cores, fontes, @ e logo salvos uma vez e aplicados em tudo.</p>
                <div className="mt-8 flex gap-2" aria-hidden>
                  {["#0b1f3a", "#0ea5a4", "#ffffff", "#f59e0b", "#111111"].map((c) => (
                    <span key={c} className="size-10 rounded-lg border border-white/15" style={{ background: c }} />
                  ))}
                </div>
                <div className="mt-4 flex items-baseline gap-3 text-neutral-300" aria-hidden>
                  <span className="text-2xl font-bold tracking-[-0.03em]">Aa</span>
                  <span className="text-sm text-neutral-500">Inter · Montserrat · Playfair · Space Grotesk</span>
                </div>
              </article>

              {/* Editor */}
              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:col-span-2">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Editor sem curva de aprendizado</h3>
                <p className="mt-2 leading-relaxed text-neutral-400">Texto, layout, cores e foto por slide. Tudo salvo automaticamente.</p>
                <div className="mt-8 space-y-3" aria-hidden>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 p-0.5 text-center text-xs">
                    <span className="rounded-md py-1.5 text-neutral-500">Topo</span>
                    <span className="rounded-md bg-white/10 py-1.5 text-white">Meio</span>
                    <span className="rounded-md py-1.5 text-neutral-500">Base</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-white/10">
                    <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-primary" />
                  </div>
                </div>
              </article>

              {/* Export */}
              <article className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 md:col-span-2">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">Pronto para postar</h3>
                <p className="mt-2 leading-relaxed text-neutral-400">Arquivos em 1080×1350 no formato que você precisar.</p>
                <div className="mt-8 flex flex-wrap gap-2" aria-hidden>
                  {["PNG", "ZIP", "PDF"].map((f) => (
                    <span key={f} className="rounded-lg border border-white/10 px-3 py-2 font-mono text-sm text-neutral-300">
                      .{f.toLowerCase()}
                    </span>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* PREÇOS */}
        <section id="precos" className="scroll-mt-16 border-t border-white/[0.06] py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="max-w-2xl">
              <Eyebrow>Preços</Eyebrow>
              <SectionTitle>Comece grátis. Assine quando fizer sentido.</SectionTitle>
            </div>
            <div className="mt-16 grid gap-4 lg:grid-cols-3">
              {PLAN_IDS.map((id) => {
                const plan = PLANS[id];
                const featured = id === "pro";
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex flex-col rounded-2xl border p-8",
                      featured ? "border-primary/60 bg-primary/[0.04]" : "border-white/[0.08] bg-white/[0.02]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                      {featured ? <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-primary">Mais escolhido</span> : null}
                    </div>
                    <p className="mt-6 flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-[-0.04em] text-white">
                        {plan.priceBRL === 0 ? "R$0" : formatBRL(plan.priceBRL)}
                      </span>
                      <span className="text-neutral-500">/mês</span>
                    </p>
                    <ul className="mt-8 flex-1 space-y-3 text-[15px]">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-neutral-300">
                          <Check className="mt-0.5 size-4 shrink-0 text-neutral-500" aria-hidden />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={id === "free" ? "/signup" : `/signup?plan=${id}`}
                      className={cn(
                        "mt-10 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                        featured
                          ? "bg-primary text-primary-foreground hover:bg-[#ff8c3a] focus-visible:outline-primary"
                          : "border border-white/15 text-white hover:bg-white/5 focus-visible:outline-white",
                      )}
                    >
                      {id === "free" ? "Começar grátis" : `Assinar ${plan.name}`}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 border-t border-white/[0.06] py-28 sm:py-36">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <Eyebrow>Dúvidas</Eyebrow>
              <SectionTitle>Perguntas frequentes</SectionTitle>
            </div>
            <Accordion type="single" collapsible>
              {FAQ.map((item, i) => (
                <AccordionItem key={item.q} value={`item-${i}`} className="border-white/[0.08]">
                  <AccordionTrigger className="py-6 text-left text-base font-medium text-white hover:no-underline">{item.q}</AccordionTrigger>
                  <AccordionContent className="pb-6 text-[15px] leading-relaxed text-neutral-400">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
          <div className="bg-grain pointer-events-none absolute inset-0 opacity-[0.3]" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-6">
            <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.04] tracking-[-0.045em] text-white">
              Seu próximo post começa aqui.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-400">Escreva o tema e veja o carrossel pronto em menos de um minuto.</p>
            <HeroPrompt className="mx-auto mt-10 max-w-2xl text-left" showExamples={false} />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo height={20} />
          <nav aria-label="Rodapé" className="flex flex-wrap gap-6">
            <a href="#templates" className="hover:text-white">Templates</a>
            <a href="#precos" className="hover:text-white">Preços</a>
            <a href="#faq" className="hover:text-white">Dúvidas</a>
            <Link href="/login" className="hover:text-white">Entrar</Link>
          </nav>
          <p>© {new Date().getFullYear()} slidely</p>
        </div>
      </footer>
    </div>
  );
}
