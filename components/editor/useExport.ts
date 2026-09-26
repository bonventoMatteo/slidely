"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ClientApiError, postJson } from "@/lib/fetch-json";
import { useEditorMeta } from "./EditorContext";

export type ExportFormat = "png" | "zip" | "pdf";
export type RenderedFile = { name: string; url: string };

/**
 * Salva pendências e gera os arquivos no servidor (URLs assinadas por 1h).
 * Compartilhado entre o editor desktop (download direto) e o mobile (compartilhar).
 */
export function useExport() {
  const router = useRouter();
  const { carouselId, pdfExport, flush } = useEditorMeta();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const render = useCallback(
    async (format: ExportFormat): Promise<RenderedFile[] | null> => {
      if (format === "pdf" && !pdfExport) {
        toast.error("Export em PDF está disponível nos planos Pro e Business.", {
          action: { label: "Ver planos", onClick: () => router.push("/billing") },
        });
        return null;
      }
      setExporting(format);
      try {
        const saved = await flush();
        if (!saved) throw new Error("Não foi possível salvar as últimas alterações. Tente novamente.");
        const { files } = await postJson<{ files: RenderedFile[] }>("/api/render", { carouselId, format });
        return files;
      } catch (err) {
        if (err instanceof ClientApiError && err.code === "plan_required") {
          toast.error(err.message, { action: { label: "Ver planos", onClick: () => router.push("/billing") } });
        } else {
          toast.error(err instanceof Error ? err.message : "Falha ao exportar.");
        }
        return null;
      } finally {
        setExporting(null);
      }
    },
    [carouselId, pdfExport, flush, router],
  );

  return { render, exporting };
}

/** Dispara o download das URLs assinadas (Content-Disposition: attachment). */
export async function downloadAll(files: RenderedFile[]) {
  for (const file of files) {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (files.length > 1) await new Promise((resolve) => setTimeout(resolve, 350));
  }
}
