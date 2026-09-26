"use client";

import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EXAMPLES = ["5 erros de quem começa a investir", "Rotina de skincare para iniciantes", "Como precificar serviços de freela"];

/**
 * Campo de tema do hero. É um formulário GET para /signup?tema=… (funciona sem JS);
 * depois do cadastro o gerador abre com o tema preenchido.
 */
export function HeroPrompt({ className, showExamples = true }: { className?: string; showExamples?: boolean }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("w-full", className)}>
      <form action="/signup" method="get" className="group relative">
        <label htmlFor="tema-hero" className="sr-only">
          Tema do carrossel
        </label>
        <div className="flex flex-col gap-2 rounded-2xl border border-white/12 bg-white/[0.04] p-2 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] transition-colors focus-within:border-white/25 sm:flex-row sm:items-center">
          <input
            ref={inputRef}
            id="tema-hero"
            name="tema"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={300}
            autoComplete="off"
            placeholder="Sobre o que é o seu próximo carrossel?"
            className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-foreground placeholder:text-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-[#ff8c3a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Criar grátis
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </form>
      {showExamples ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-neutral-500">
          <span>Experimente:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setValue(example);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-white/10 px-3 py-1 text-neutral-400 transition-colors hover:border-white/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
