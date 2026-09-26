"use client";

import { Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientApiError, postJson } from "@/lib/fetch-json";
import type { SlideContent, SlideFormat, SlideRole } from "@/lib/schemas/carousel.zod";
import { useEditor } from "@/lib/stores/editor.store";
import { useEditorMeta } from "./EditorContext";

const ROLE_LABEL: Record<SlideRole, string> = { hook: "Capa (gancho)", content: "Conteúdo", cta: "CTA (chamada final)" };
const FORMAT_LABEL: Record<SlideFormat, string> = { text: "Texto", list: "Lista", stat: "Número em destaque", quote: "Citação" };

function words(text: string | undefined) {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <span className="text-[11px] tabular-nums text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function TextPanel() {
  const slide = useEditor((s) => s.slides[s.currentIndex]);
  const updateContent = useEditor((s) => s.updateContent);
  const replaceContent = useEditor((s) => s.replaceContent);
  const { carouselId, flush } = useEditorMeta();
  const [instruction, setInstruction] = useState("");
  const [regenerating, setRegenerating] = useState(false);

  if (!slide) return null;
  const { content } = slide;
  const set = (patch: Partial<SlideContent>) => updateContent(slide.id, patch);

  async function regenerate() {
    if (!slide) return;
    setRegenerating(true);
    try {
      const saved = await flush();
      if (!saved) throw new Error("Não foi possível salvar antes de regenerar. Tente novamente.");
      const result = await postJson<{ slideId: string; content: SlideContent }>("/api/generate/slide", {
        carouselId,
        slideId: slide.id,
        instruction: instruction.trim() || undefined,
      });
      replaceContent(result.slideId, result.content);
      setInstruction("");
      toast.success("Slide reescrito.");
    } catch (err) {
      toast.error(err instanceof ClientApiError || err instanceof Error ? err.message : "Falha ao regenerar.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <Field id="slide-role" label="Tipo do slide">
        <Select value={content.role} onValueChange={(role: SlideRole) => set({ role })}>
          <SelectTrigger id="slide-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ROLE_LABEL) as SlideRole[]).map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="slide-format" label="Formato">
          <Select value={content.format ?? "text"} onValueChange={(format: SlideFormat) => set({ format })}>
            <SelectTrigger id="slide-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FORMAT_LABEL) as SlideFormat[]).map((f) => (
                <SelectItem key={f} value={f}>
                  {FORMAT_LABEL[f]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="slide-kicker" label="Rótulo">
          <Input
            id="slide-kicker"
            maxLength={40}
            placeholder="Ex.: Passo 2"
            value={content.kicker ?? ""}
            onChange={(e) => set({ kicker: e.target.value || undefined })}
          />
        </Field>
      </div>

      {content.format === "stat" ? (
        <Field id="slide-stat" label="Número em destaque" hint="Ex.: 36%, R$ 1,1 bi, 3x">
          <Input id="slide-stat" maxLength={24} value={content.stat ?? ""} onChange={(e) => set({ stat: e.target.value || undefined })} />
        </Field>
      ) : null}

      {content.role === "hook" ? (
        <Field id="slide-hook" label="Gancho" hint={`${words(content.hook)}/10 palavras`}>
          <Textarea
            id="slide-hook"
            rows={2}
            maxLength={200}
            value={content.hook ?? ""}
            onChange={(e) => set({ hook: e.target.value })}
            className="resize-none"
          />
        </Field>
      ) : null}

      {content.role === "cta" ? (
        <Field id="slide-cta" label="Chamada (CTA)" hint={`${words(content.cta)}/15 palavras`}>
          <Textarea
            id="slide-cta"
            rows={2}
            maxLength={200}
            value={content.cta ?? ""}
            onChange={(e) => set({ cta: e.target.value })}
            className="resize-none"
          />
        </Field>
      ) : null}

      <Field
        id="slide-title"
        label={content.role === "content" ? "Título" : "Subtítulo"}
        hint={content.role === "content" ? `${words(content.title)} palavras` : undefined}
      >
        <Input id="slide-title" maxLength={200} value={content.title} onChange={(e) => set({ title: e.target.value })} />
      </Field>

      <Field id="slide-body" label="Corpo" hint={`${words(content.body)} palavras`}>
        <Textarea
          id="slide-body"
          rows={6}
          maxLength={1200}
          value={content.body}
          onChange={(e) => set({ body: e.target.value })}
          className="resize-y"
        />
      </Field>

      <p className="rounded-lg bg-white/[0.03] p-3 text-[11px] leading-relaxed text-muted-foreground">
        Use <code className="rounded bg-white/10 px-1 text-foreground">**palavra**</code> para destacar e comece linhas com{" "}
        <code className="rounded bg-white/10 px-1 text-foreground">- </code> para virar lista.
      </p>

      {content.visual_hint ? (
        <p className="flex gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs text-muted-foreground">
          <Lightbulb className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Sugestão visual:</span> {content.visual_hint}
          </span>
        </p>
      ) : null}

      <div className="space-y-2 rounded-xl border border-white/10 p-3">
        <Label htmlFor="regen-instruction" className="text-xs">
          Reescrever com IA
        </Label>
        <Input
          id="regen-instruction"
          placeholder="Opcional: “mais direto”, “use um exemplo”…"
          maxLength={300}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !regenerating && void regenerate()}
        />
        <Button type="button" variant="secondary" className="w-full" onClick={regenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          Regenerar slide
        </Button>
      </div>
    </div>
  );
}
