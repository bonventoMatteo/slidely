"use client";

import { LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewCarouselDialog } from "@/components/carousel/NewCarouselDialog";
import { EmptyState } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import type { CreationOptions, TemplateOption } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TemplateCard } from "./Card";
import { TemplatePreview } from "./Preview";

const ALL = "Todos";
const PRO = "Coleção Pro";

export function TemplatesGrid(options: CreationOptions) {
  const router = useRouter();
  const { templates } = options;
  const [category, setCategory] = useState(ALL);
  const [preview, setPreview] = useState<TemplateOption | null>(null);
  const [chosen, setChosen] = useState<TemplateOption | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const categories = useMemo(
    () => [ALL, PRO, ...Array.from(new Set(templates.map((t) => t.category ?? "Geral")))],
    [templates],
  );
  const visible =
    category === ALL
      ? [...templates].sort((a, b) => Number(b.layout.collection === "pro") - Number(a.layout.collection === "pro"))
      : category === PRO
        ? templates.filter((t) => t.layout.collection === "pro")
        : templates.filter((t) => (t.category ?? "Geral") === category);

  function use(template: TemplateOption) {
    if (template.locked) {
      router.push("/billing");
      return;
    }
    setPreview(null);
    setChosen(template);
    setDialogOpen(true);
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title="Nenhum template disponível"
        description="Aplique a migration supabase/migrations/0002_seed_templates.sql para carregar os templates."
      />
    );
  }

  return (
    <>
      <div role="tablist" aria-label="Filtrar por nicho" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              category === c ? "border-primary bg-primary/15 text-foreground" : "border-white/10 text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard key={template.id} template={template} onPreview={() => setPreview(template)} onUse={() => use(template)} />
        ))}
      </ul>

      <TemplatePreview
        template={preview}
        open={Boolean(preview)}
        onOpenChange={(open) => !open && setPreview(null)}
        footer={
          preview ? (
            <div className="flex justify-end">
              <Button onClick={() => use(preview)}>{preview.locked ? "Ver plano Business" : "Usar este template"}</Button>
            </div>
          ) : null
        }
      />

      <NewCarouselDialog
        {...options}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTemplateId={chosen?.id}
        defaultNiche={chosen?.layout.niche}
      >
        <span className="hidden" />
      </NewCarouselDialog>
    </>
  );
}
