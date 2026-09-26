"use client";

import { createContext, useContext } from "react";
import type { BrandKitOption } from "@/lib/types";

export type EditorMeta = {
  userId: string;
  carouselId: string;
  projectId: string;
  projectTitle: string;
  watermark: boolean;
  pdfExport: boolean;
  brandKits: BrandKitOption[];
  /** Salva pendências imediatamente (antes de exportar/regenerar). */
  flush: () => Promise<boolean>;
};

export const EditorMetaContext = createContext<EditorMeta | null>(null);

export function useEditorMeta(): EditorMeta {
  const meta = useContext(EditorMetaContext);
  if (!meta) throw new Error("useEditorMeta fora do editor");
  return meta;
}
