"use client";

import { AlertCircle, ArrowLeft, Check, ChevronDown, Download, FileArchive, FileImage, FileText, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/lib/stores/editor.store";
import { useEditorMeta } from "./EditorContext";
import { downloadAll, useExport, type ExportFormat } from "./useExport";

export function SaveIndicator({ onRetry }: { onRetry: () => void }) {
  const status = useEditor((s) => s.saveStatus);
  const pending = useEditor((s) => s.revision !== s.savedRevision);

  if (status === "error") {
    return (
      <button type="button" onClick={onRetry} className="flex items-center gap-1.5 text-xs text-destructive hover:underline">
        <AlertCircle className="size-3.5" aria-hidden /> Erro ao salvar — tentar de novo
      </button>
    );
  }
  const label = status === "saving" || pending ? "Salvando…" : status === "saved" ? "Salvo" : "Tudo salvo";
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
      {status === "saving" || pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
      {label}
    </span>
  );
}

export function Toolbar() {
  const title = useEditor((s) => s.title);
  const setTitle = useEditor((s) => s.setTitle);
  const { projectId, projectTitle, pdfExport, flush } = useEditorMeta();
  const { render, exporting } = useExport();

  async function exportAs(format: ExportFormat) {
    const files = await render(format);
    if (!files) return;
    await downloadAll(files);
    toast.success(files.length > 1 ? `${files.length} imagens baixadas.` : "Download iniciado.");
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/5 px-3">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/projects/${projectId}`} aria-label={`Voltar para ${projectTitle}`}>
          <ArrowLeft aria-hidden />
          <span className="hidden max-w-40 truncate xl:inline">{projectTitle}</span>
        </Link>
      </Button>
      <div className="h-5 w-px bg-white/10" aria-hidden />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 200))}
        aria-label="Título do carrossel"
        className="h-8 max-w-sm border-transparent bg-transparent font-semibold shadow-none hover:border-input focus-visible:border-input dark:bg-transparent"
      />
      <div className="ml-auto flex items-center gap-3">
        <SaveIndicator onRetry={() => void flush()} />
        <Button
          type="button"
          onClick={() => exportAs("zip")}
          disabled={exporting !== null}
          className="bg-gradient-brand font-semibold text-brand-dark hover:opacity-90"
        >
          {exporting === "zip" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          Baixar PNGs
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Mais formatos de exportação" disabled={exporting !== null}>
              {exporting && exporting !== "zip" ? <Loader2 className="animate-spin" aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Exportar 1080×1350</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => exportAs("zip")}>
              <FileArchive aria-hidden /> ZIP com todos os PNGs
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs("png")}>
              <FileImage aria-hidden /> PNGs separados
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportAs("pdf")}>
              <FileText aria-hidden /> PDF (LinkedIn)
              {!pdfExport ? <Lock className="ml-auto size-3.5" aria-label="Plano Pro" /> : null}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
