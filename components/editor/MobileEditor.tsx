"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Lock,
  Palette,
  Plus,
  Share2,
  Trash2,
  Type,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SlidePreview } from "@/components/slide/SlidePreview";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { EditorSlide, Theme } from "@/lib/schemas/carousel.zod";
import { MAX_SLIDES, MIN_SLIDES } from "@/lib/schemas/generate.zod";
import { useEditor } from "@/lib/stores/editor.store";
import { cn } from "@/lib/utils";
import { Canvas } from "./Canvas";
import { ColorPanel } from "./ColorPanel";
import { useEditorMeta } from "./EditorContext";
import { LayoutPicker } from "./LayoutPicker";
import { PhotoPanel } from "./PhotoPanel";
import { TextPanel } from "./TextPanel";
import { downloadAll, useExport, type ExportFormat, type RenderedFile } from "./useExport";

type Panel = "text" | "layout" | "style" | "photos";

const PANELS: { id: Panel; label: string; icon: typeof Type }[] = [
  { id: "text", label: "Texto", icon: Type },
  { id: "layout", label: "Layout", icon: LayoutGrid },
  { id: "style", label: "Design", icon: Palette },
  { id: "photos", label: "Fotos", icon: ImageIcon },
];

// ---------------------------------------------------------------------------
// Barra superior
// ---------------------------------------------------------------------------

function MobileToolbar({ onExport }: { onExport: () => void }) {
  const title = useEditor((s) => s.title);
  const status = useEditor((s) => s.saveStatus);
  const pending = useEditor((s) => s.revision !== s.savedRevision);
  const { projectId, projectTitle, flush } = useEditorMeta();
  const saving = status === "saving" || pending;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] px-2">
      <Button asChild variant="ghost" size="icon" className="size-10">
        <Link href={`/projects/${projectId}`} aria-label={`Voltar para ${projectTitle}`}>
          <ArrowLeft aria-hidden />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {status === "error" ? (
          <button type="button" onClick={() => void flush()} className="text-[11px] text-destructive">
            Erro ao salvar. Tocar para tentar de novo
          </button>
        ) : (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground" role="status" aria-live="polite">
            {saving ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Check className="size-3" aria-hidden />}
            {saving ? "Salvando…" : "Salvo"}
          </p>
        )}
      </div>
      <Button onClick={onExport} className="h-10 bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
        <Download aria-hidden /> Exportar
      </Button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Faixa de slides (tocar seleciona, segurar e arrastar reordena)
// ---------------------------------------------------------------------------

function StripThumb({ slide, index, total, theme, active, watermark }: { slide: EditorSlide; index: number; total: number; theme: Theme; active: boolean; watermark: boolean }) {
  const select = useEditor((s) => s.select);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative shrink-0", isDragging && "z-10 scale-105 opacity-90")}
    >
      <button
        type="button"
        onClick={() => select(index)}
        aria-label={`Slide ${index + 1}${active ? " (selecionado)" : ""}. Segure e arraste para reordenar.`}
        aria-current={active ? "true" : undefined}
        className={cn(
          "block touch-manipulation overflow-hidden rounded-md border-2",
          active ? "border-primary" : "border-transparent",
        )}
        {...attributes}
        {...listeners}
      >
        <SlidePreview slide={slide} theme={theme} position={index + 1} total={total} width={56} watermark={watermark} />
      </button>
      <span className="pointer-events-none absolute -left-1 -top-1 flex size-4 items-center justify-center rounded-full bg-black/80 text-[9px] font-semibold tabular-nums text-white">
        {index + 1}
      </span>
    </li>
  );
}

function SlideStrip() {
  const slides = useEditor((s) => s.slides);
  const theme = useEditor((s) => s.theme);
  const currentIndex = useEditor((s) => s.currentIndex);
  const reorder = useEditor((s) => s.reorder);
  const addSlide = useEditor((s) => s.addSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const removeSlide = useEditor((s) => s.removeSlide);
  const { watermark } = useEditorMeta();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) reorder(String(event.active.id), String(event.over.id));
  }

  const current = slides[currentIndex];
  const canAdd = slides.length < MAX_SLIDES;
  const canRemove = slides.length > MIN_SLIDES;

  return (
    <div className="shrink-0 border-t border-white/[0.06] bg-sidebar/60">
      <div className="flex items-center gap-1 px-2 pt-2">
        <span className="mr-auto pl-1 text-[11px] text-muted-foreground">
          Slide {currentIndex + 1} de {slides.length}
        </span>
        <Button variant="ghost" size="sm" className="h-9" disabled={!canAdd || !current} onClick={() => current && duplicateSlide(current.id)}>
          <Copy aria-hidden /> Duplicar
        </Button>
        <Button variant="ghost" size="sm" className="h-9 text-destructive" disabled={!canRemove || !current} onClick={() => current && removeSlide(current.id)}>
          <Trash2 aria-hidden /> Remover
        </Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          <ol className="flex items-center gap-2 overflow-x-auto px-3 pb-3 pt-2 [scrollbar-width:none]">
            {slides.map((slide, index) => (
              <StripThumb key={slide.id} slide={slide} index={index} total={slides.length} theme={theme} active={index === currentIndex} watermark={watermark} />
            ))}
            <li className="shrink-0">
              <button
                type="button"
                disabled={!canAdd}
                onClick={() => addSlide(currentIndex)}
                aria-label="Adicionar slide"
                className="flex h-[70px] w-[56px] items-center justify-center rounded-md border-2 border-dashed border-white/15 text-muted-foreground disabled:opacity-40"
              >
                <Plus className="size-5" aria-hidden />
              </button>
            </li>
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exportação: gerar → salvar na galeria / compartilhar (Web Share) ou baixar
// ---------------------------------------------------------------------------

function ExportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { render, exporting } = useExport();
  const { pdfExport } = useEditorMeta();
  const title = useEditor((s) => s.title);
  const [result, setResult] = useState<{ format: ExportFormat; files: RenderedFile[]; shareable: File[] } | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (!open) setResult(null);
  }, [open]);

  async function generate(format: ExportFormat) {
    const files = await render(format);
    if (!files) return;
    // Baixa os arquivos agora: o compartilhamento precisa acontecer logo após um toque do usuário.
    setPreparing(true);
    let shareable: File[] = [];
    try {
      shareable = await Promise.all(
        files.map(async (f) => {
          const res = await fetch(f.url);
          const blob = await res.blob();
          return new File([blob], f.name, { type: blob.type || (f.name.endsWith(".pdf") ? "application/pdf" : "image/png") });
        }),
      );
      if (!(typeof navigator.canShare === "function" && navigator.canShare({ files: shareable }))) shareable = [];
    } catch {
      shareable = [];
    } finally {
      setPreparing(false);
    }
    setResult({ format, files, shareable });
  }

  async function share() {
    if (!result?.shareable.length) return;
    try {
      await navigator.share({ files: result.shareable, title });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Não foi possível abrir o compartilhamento. Use o botão Baixar.");
    }
  }

  const busy = exporting !== null || preparing;

  return (
    <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Exportar carrossel</SheetTitle>
          <SheetDescription>Imagens em 1080×1350, prontas para o Instagram.</SheetDescription>
        </SheetHeader>

        {busy ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center" role="status" aria-live="polite">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{preparing ? "Preparando arquivos…" : "Gerando imagens…"}</p>
            <p className="text-xs text-muted-foreground">Leva alguns segundos.</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-3 px-4 pb-2">
            <p className="text-sm text-muted-foreground">
              {result.files.length > 1 ? `${result.files.length} arquivos prontos.` : "Arquivo pronto."}
            </p>
            {result.shareable.length ? (
              <Button onClick={share} className="h-12 bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
                <Share2 aria-hidden /> {result.format === "png" ? "Salvar na galeria / compartilhar" : "Compartilhar"}
              </Button>
            ) : null}
            <Button variant="outline" className="h-12 text-base" onClick={() => void downloadAll(result.files)}>
              <Download aria-hidden /> Baixar {result.files.length > 1 ? "arquivos" : "arquivo"}
            </Button>
            {result.format === "png" ? (
              <ul className="mt-2 grid grid-cols-4 gap-2">
                {result.files.map((f, i) => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md ring-1 ring-white/10" aria-label={`Abrir slide ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária */}
                      <img src={f.url} alt="" className="aspect-[4/5] w-full object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {result.format === "png" && !result.shareable.length ? (
              <p className="text-xs text-muted-foreground">No iPhone, toque numa imagem e segure para salvar nas Fotos.</p>
            ) : null}
            <Button variant="ghost" onClick={() => setResult(null)}>
              Exportar em outro formato
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-4 pb-2">
            {(
              [
                { format: "png", icon: ImageIcon, label: "Imagens PNG", hint: "Para salvar na galeria e postar" },
                { format: "zip", icon: FileArchive, label: "ZIP com todos os PNGs", hint: "Um arquivo só" },
                { format: "pdf", icon: FileText, label: "PDF", hint: "Para LinkedIn" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.format}
                type="button"
                onClick={() => void generate(opt.format)}
                className="flex items-center gap-4 rounded-xl border border-white/10 p-4 text-left transition-colors hover:bg-white/5 active:bg-white/10"
              >
                <opt.icon className="size-6 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
                {opt.format === "pdf" && !pdfExport ? <Lock className="size-4 text-muted-foreground" aria-label="Plano Pro" /> : null}
              </button>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Editor mobile
// ---------------------------------------------------------------------------

export function MobileEditor() {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const active = PANELS.find((p) => p.id === panel);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <MobileToolbar onExport={() => setExportOpen(true)} />

      {/* O slide encolhe quando um painel abre: a edição é vista ao vivo. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <Canvas compact />
      </div>

      {panel && active ? (
        <section aria-label={`Painel ${active.label}`} className="flex h-[48dvh] shrink-0 flex-col border-t border-white/[0.08] bg-sidebar">
          <div className="flex h-11 shrink-0 items-center justify-between px-4">
            <h2 className="text-sm font-semibold">{active.label}</h2>
            <Button variant="ghost" size="icon" className="size-9" onClick={() => setPanel(null)} aria-label="Fechar painel">
              <X aria-hidden />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
            {panel === "text" ? <TextPanel /> : null}
            {panel === "layout" ? <LayoutPicker /> : null}
            {panel === "style" ? <ColorPanel /> : null}
            {panel === "photos" ? <PhotoPanel /> : null}
          </div>
        </section>
      ) : (
        <SlideStrip />
      )}

      <nav aria-label="Ferramentas" className="grid shrink-0 grid-cols-4 border-t border-white/[0.06] bg-background pb-[env(safe-area-inset-bottom)]">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPanel((current) => (current === p.id ? null : p.id))}
            aria-pressed={panel === p.id}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
              panel === p.id ? "text-primary" : "text-muted-foreground",
            )}
          >
            <p.icon className="size-5" aria-hidden />
            {p.label}
          </button>
        ))}
      </nav>

      <ExportSheet open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}
