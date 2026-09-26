"use client";

import { useCallback, useEffect, useRef } from "react";
import type { StoreApi } from "zustand";
import { logClientError } from "@/lib/client-log";
import type { EditorState } from "@/lib/stores/editor.store";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 800;

/**
 * Auto-save com debounce: salva slides (RPC transacional) e, quando mudam,
 * título e tema do carrossel. Saves são serializados para nunca sobrepor.
 */
export function useAutoSave(store: StoreApi<EditorState>) {
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<boolean> | null>(null);
  const lastMeta = useRef({
    title: store.getState().title,
    theme: JSON.stringify(store.getState().theme),
  });

  const saveNow = useCallback(async (): Promise<boolean> => {
    if (inflight.current) await inflight.current;
    const state = store.getState();
    if (state.revision === state.savedRevision) return true;

    const revision = state.revision;
    const supabase = createClient();
    state.markSaving();

    const run = (async () => {
      try {
        const { error } = await supabase.rpc("save_carousel_slides", {
          p_carousel_id: state.carouselId,
          p_slides: state.slides.map((s) => ({
            id: s.id,
            position: s.position,
            layout: s.layout,
            content: s.content,
            image_url: s.image_url,
          })),
        });
        if (error) throw new Error(error.message);

        const theme = JSON.stringify(state.theme);
        if (state.title !== lastMeta.current.title || theme !== lastMeta.current.theme) {
          const { error: metaError } = await supabase
            .from("carousels")
            .update({ title: state.title, theme: state.theme })
            .eq("id", state.carouselId);
          if (metaError) throw new Error(metaError.message);
          lastMeta.current = { title: state.title, theme };
        }

        store.getState().markSaved(revision);
        return true;
      } catch (err) {
        logClientError("autosave_failed", err, { carouselId: state.carouselId });
        store.getState().markError();
        return false;
      }
    })();

    inflight.current = run;
    const ok = await run;
    inflight.current = null;

    // Houve edição durante o save: agenda outro.
    const after = store.getState();
    if (ok && after.revision !== after.savedRevision) {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void saveNow(), DEBOUNCE_MS);
    }
    return ok;
  }, [store]);

  useEffect(() => {
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.revision !== prev.revision) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void saveNow(), DEBOUNCE_MS);
      }
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer.current);
    };
  }, [store, saveNow]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = store.getState();
      if (state.revision !== state.savedRevision) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [store]);

  /** Salva imediatamente o que estiver pendente. Retorna false se falhar. */
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    return saveNow();
  }, [saveNow]);

  return { flush };
}
