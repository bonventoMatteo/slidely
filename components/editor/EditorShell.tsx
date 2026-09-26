"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/lib/use-media-query";
import { createEditorStore, EditorStoreContext, type EditorData } from "@/lib/stores/editor.store";
import type { BrandKitOption } from "@/lib/types";
import { Canvas } from "./Canvas";
import { ColorPanel } from "./ColorPanel";
import { EditorMetaContext, type EditorMeta } from "./EditorContext";
import { LayoutPicker } from "./LayoutPicker";
import { MobileEditor } from "./MobileEditor";
import { PhotoPanel } from "./PhotoPanel";
import { SlideList } from "./SlideList";
import { TextPanel } from "./TextPanel";
import { Toolbar } from "./Toolbar";
import { useAutoSave } from "./useAutoSave";

type Props = {
  initial: EditorData;
  userId: string;
  projectId: string;
  projectTitle: string;
  watermark: boolean;
  pdfExport: boolean;
  brandKits: BrandKitOption[];
};

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.getAttribute("role") === "combobox";
}

export function EditorShell({ initial, userId, projectId, projectTitle, watermark, pdfExport, brandKits }: Props) {
  // Store por instância do editor (evita estado compartilhado entre requests no SSR).
  const [store] = useState(() => createEditorStore(initial));
  const { flush } = useAutoSave(store);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const meta = useMemo<EditorMeta>(
    () => ({ userId, carouselId: initial.carouselId, projectId, projectTitle, watermark, pdfExport, brandKits, flush }),
    [userId, initial.carouselId, projectId, projectTitle, watermark, pdfExport, brandKits, flush],
  );

  // ←/→ navegam entre slides quando o foco não está em um campo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const { currentIndex, select } = store.getState();
      if (event.key === "ArrowRight") select(currentIndex + 1);
      if (event.key === "ArrowLeft") select(currentIndex - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store]);

  return (
    <EditorStoreContext.Provider value={store}>
      <EditorMetaContext.Provider value={meta}>
        {isDesktop === null ? (
          <div className="flex h-dvh items-center justify-center" aria-busy="true" aria-label="Carregando editor">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : !isDesktop ? (
          <MobileEditor />
        ) : (
        <div className="flex h-dvh flex-col">
          <Toolbar />
          <div className="flex min-h-0 flex-1">
            <SlideList />
            <Canvas />
            <aside aria-label="Edição do slide" className="flex w-[340px] shrink-0 flex-col border-l border-white/5 bg-sidebar/60">
              <Tabs defaultValue="text" className="flex min-h-0 flex-1 flex-col gap-0">
                <TabsList className="m-3 grid w-auto grid-cols-4">
                  <TabsTrigger value="text">Texto</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                  <TabsTrigger value="style">Design</TabsTrigger>
                  <TabsTrigger value="photos">Fotos</TabsTrigger>
                </TabsList>
                <ScrollArea className="min-h-0 flex-1">
                  <div className="px-4 pb-6">
                    <TabsContent value="text">
                      <TextPanel />
                    </TabsContent>
                    <TabsContent value="layout">
                      <LayoutPicker />
                    </TabsContent>
                    <TabsContent value="style">
                      <ColorPanel />
                    </TabsContent>
                    <TabsContent value="photos">
                      <PhotoPanel />
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </aside>
          </div>
        </div>
        )}
      </EditorMetaContext.Provider>
    </EditorStoreContext.Provider>
  );
}
