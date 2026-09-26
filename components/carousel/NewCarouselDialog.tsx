"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Loader2, Lock, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ClientApiError, postJson } from "@/lib/fetch-json";
import { MAX_SLIDES, MIN_SLIDES, TONES } from "@/lib/schemas/generate.zod";
import type { CreationOptions } from "@/lib/types";

const NONE = "none";

const formSchema = z.object({
  prompt: z.string().trim().min(3, "Descreva o tema ou cole um link").max(8000, "Máximo de 8000 caracteres"),
  niche: z.string().trim().min(2, "Informe o nicho").max(80),
  tone: z.enum(TONES),
  slideCount: z.number().int().min(MIN_SLIDES).max(MAX_SLIDES),
  templateId: z.string(),
  brandKitId: z.string(),
  projectId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const STEPS_TEXT = ["Lendo o tema…", "Escrevendo o roteiro card por card…", "Criando a capa e o gancho…", "Montando as artes…"];
const STEPS_LINK = ["Lendo a matéria do link…", "Extraindo os pontos principais…", "Escrevendo o roteiro card por card…", "Montando as artes…"];

type Props = CreationOptions & {
  children: ReactNode;
  /** Quando aberto dentro de um projeto, o projeto é fixo. */
  fixedProjectId?: string;
  defaultNiche?: string;
  defaultTemplateId?: string;
  /** Tema vindo da landing (?tema=): abre o diálogo já preenchido. */
  defaultPrompt?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function NewCarouselDialog({
  children,
  templates,
  brandKits,
  projects,
  fixedProjectId,
  defaultNiche,
  defaultTemplateId,
  defaultPrompt,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(defaultPrompt));
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [step, setStep] = useState(0);

  const fixedProject = projects.find((p) => p.id === fixedProjectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prompt: defaultPrompt ?? "",
      niche: defaultNiche ?? fixedProject?.niche ?? "",
      tone: "profissional",
      slideCount: 7,
      templateId: defaultTemplateId ?? NONE,
      brandKitId: fixedProject?.brandKitId ?? brandKits[0]?.id ?? NONE,
      projectId: fixedProjectId ?? NONE,
    },
  });

  // Aberto a partir de um template: pré-seleciona template e nicho.
  useEffect(() => {
    if (defaultTemplateId) form.setValue("templateId", defaultTemplateId);
    if (defaultNiche && !form.getValues("niche")) form.setValue("niche", defaultNiche);
  }, [defaultTemplateId, defaultNiche, form]);

  const submitting = form.formState.isSubmitting;
  const promptValue = form.watch("prompt");
  const isLink = /^https?:\/\/\S+$/i.test(promptValue.trim());
  const steps = isLink ? STEPS_LINK : STEPS_TEXT;

  useEffect(() => {
    if (!submitting) {
      setStep(0);
      return;
    }
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 3500);
    return () => window.clearInterval(id);
  }, [submitting, steps.length]);

  async function onSubmit(values: FormValues) {
    try {
      const { carouselId } = await postJson<{ carouselId: string }>("/api/generate", {
        prompt: values.prompt,
        niche: values.niche,
        tone: values.tone,
        slideCount: values.slideCount,
        templateId: values.templateId === NONE ? null : values.templateId,
        brandKitId: values.brandKitId === NONE ? null : values.brandKitId,
        projectId: values.projectId === NONE ? null : values.projectId,
      });
      toast.success("Carrossel criado! Abrindo o editor…");
      setOpen(false);
      form.reset();
      router.push(`/editor/${carouselId}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ClientApiError && (err.code === "quota_exceeded" || err.code === "plan_required")) {
        toast.error(err.message, { action: { label: "Ver planos", onClick: () => router.push("/billing") } });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o carrossel.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-black">Novo carrossel</DialogTitle>
          <DialogDescription>Escreva o tema ou cole o link de uma matéria. A IA faz o resto.</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {submitting ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="bg-gradient-brand flex size-14 items-center justify-center rounded-2xl">
                <Sparkles className="size-7 animate-pulse text-brand-dark" aria-hidden />
              </div>
              <p className="mt-6 text-lg font-semibold">{steps[step]}</p>
              <p className="mt-2 text-sm text-muted-foreground">Isso leva de 10 a 30 segundos.</p>
              <div className="mt-6 flex gap-1.5" aria-hidden>
                {steps.map((_, i) => (
                  <span key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-white/15"}`} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Form {...form}>
                <form id="new-carousel-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tema ou link</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Ex.: 5 erros que iniciantes cometem ao investir — ou cole https://…"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        {isLink ? (
                          <FormDescription className="flex items-center gap-1.5 text-primary">
                            <Link2 className="size-3.5" aria-hidden /> Vamos ler a matéria e transformar em carrossel.
                          </FormDescription>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="niche"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nicho</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex.: finanças pessoais" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tom</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TONES.map((tone) => (
                                <SelectItem key={tone} value={tone} className="capitalize">
                                  {tone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="slideCount"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Quantidade de slides</FormLabel>
                          <span className="text-sm font-semibold tabular-nums">{field.value}</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={MIN_SLIDES}
                            max={MAX_SLIDES}
                            step={1}
                            value={[field.value]}
                            onValueChange={([v]) => field.onChange(v)}
                            aria-label="Quantidade de slides"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>Padrão</SelectItem>
                              {templates.map((t) => (
                                <SelectItem key={t.id} value={t.id} disabled={t.locked}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="size-3 rounded-full border border-white/20"
                                      style={{ background: t.layout.theme.colors.primary }}
                                      aria-hidden
                                    />
                                    {t.name}
                                    <span className="text-muted-foreground">· {t.category}</span>
                                    {t.locked ? <Lock className="size-3" aria-label="Exclusivo Business" /> : null}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="brandKitId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand kit</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>Cores do template</SelectItem>
                              {brandKits.map((kit) => (
                                <SelectItem key={kit.id} value={kit.id}>
                                  <span className="flex items-center gap-2">
                                    <span className="size-3 rounded-full" style={{ background: kit.colors.primary }} aria-hidden />
                                    {kit.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {!fixedProjectId ? (
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Projeto</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NONE}>Criar novo projeto</SelectItem>
                              {projects.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  ) : null}
                </form>
              </Form>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="new-carousel-form"
            disabled={submitting}
            className="bg-gradient-brand font-semibold text-brand-dark hover:opacity-90"
          >
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            Gerar carrossel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
