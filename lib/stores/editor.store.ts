"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { EditorSlide, SlideContent, SlideLayout, Theme } from "@/lib/schemas/carousel.zod";
import { MAX_SLIDES, MIN_SLIDES } from "@/lib/schemas/generate.zod";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type EditorData = {
  carouselId: string;
  title: string;
  slides: EditorSlide[];
  theme: Theme;
};

export type EditorState = EditorData & {
  currentIndex: number;
  /** Incrementa a cada alteração persistível; o auto-save observa. */
  revision: number;
  savedRevision: number;
  saveStatus: SaveStatus;

  select: (index: number) => void;
  updateContent: (id: string, patch: Partial<SlideContent>) => void;
  replaceContent: (id: string, content: SlideContent) => void;
  setLayout: (id: string, layout: SlideLayout) => void;
  setLayoutForAll: (layout: SlideLayout, role?: SlideContent["role"]) => void;
  setImage: (id: string, url: string | null) => void;
  addSlide: (afterIndex: number) => void;
  duplicateSlide: (id: string) => void;
  removeSlide: (id: string) => void;
  reorder: (activeId: string, overId: string) => void;
  setTheme: (patch: Partial<Theme>) => void;
  setTitle: (title: string) => void;
  markSaving: () => void;
  markSaved: (revision: number) => void;
  markError: () => void;
};

/** Reatribui posições 1..n (o banco exige posições únicas e contíguas). */
function withPositions(slides: EditorSlide[]): EditorSlide[] {
  return slides.map((slide, index) => (slide.position === index + 1 ? slide : { ...slide, position: index + 1 }));
}

function newId(): string {
  return crypto.randomUUID();
}

export function createEditorStore(initial: EditorData): StoreApi<EditorState> {
  return createStore<EditorState>()((set, get) => {
    const mutate = (fn: (state: EditorState) => Partial<EditorState>) =>
      set((state) => ({ ...fn(state), revision: state.revision + 1 }));

    const mapSlide = (id: string, fn: (slide: EditorSlide) => EditorSlide) =>
      mutate((state) => ({ slides: state.slides.map((s) => (s.id === id ? fn(s) : s)) }));

    return {
      ...initial,
      slides: withPositions(initial.slides),
      currentIndex: 0,
      revision: 0,
      savedRevision: 0,
      saveStatus: "idle",

      select: (index) => set((state) => ({ currentIndex: Math.max(0, Math.min(index, state.slides.length - 1)) })),

      updateContent: (id, patch) => mapSlide(id, (s) => ({ ...s, content: { ...s.content, ...patch } })),

      replaceContent: (id, content) => mapSlide(id, (s) => ({ ...s, content })),

      setLayout: (id, layout) => mapSlide(id, (s) => ({ ...s, layout })),

      setLayoutForAll: (layout, role) =>
        mutate((state) => ({
          slides: state.slides.map((s) => (!role || s.content.role === role ? { ...s, layout } : s)),
        })),

      setImage: (id, url) => mapSlide(id, (s) => ({ ...s, image_url: url })),

      addSlide: (afterIndex) => {
        if (get().slides.length >= MAX_SLIDES) return;
        mutate((state) => {
          const slides = [...state.slides];
          const insertAt = Math.min(afterIndex + 1, slides.length);
          slides.splice(insertAt, 0, {
            id: newId(),
            position: insertAt + 1,
            layout: "default",
            content: { role: "content", title: "Novo slide", body: "Escreva aqui o conteúdo deste slide." },
            image_url: null,
          });
          return { slides: withPositions(slides), currentIndex: insertAt };
        });
      },

      duplicateSlide: (id) => {
        if (get().slides.length >= MAX_SLIDES) return;
        mutate((state) => {
          const index = state.slides.findIndex((s) => s.id === id);
          if (index === -1) return {};
          const slides = [...state.slides];
          const source = slides[index];
          slides.splice(index + 1, 0, { ...source, id: newId(), content: { ...source.content } });
          return { slides: withPositions(slides), currentIndex: index + 1 };
        });
      },

      removeSlide: (id) => {
        if (get().slides.length <= MIN_SLIDES) return;
        mutate((state) => {
          const slides = withPositions(state.slides.filter((s) => s.id !== id));
          return { slides, currentIndex: Math.min(state.currentIndex, slides.length - 1) };
        });
      },

      reorder: (activeId, overId) =>
        mutate((state) => {
          const from = state.slides.findIndex((s) => s.id === activeId);
          const to = state.slides.findIndex((s) => s.id === overId);
          if (from === -1 || to === -1 || from === to) return {};
          const slides = [...state.slides];
          const [moved] = slides.splice(from, 1);
          slides.splice(to, 0, moved);
          const currentId = state.slides[state.currentIndex]?.id;
          const reordered = withPositions(slides);
          return { slides: reordered, currentIndex: Math.max(0, reordered.findIndex((s) => s.id === currentId)) };
        }),

      setTheme: (patch) => mutate((state) => ({ theme: { ...state.theme, ...patch } })),

      setTitle: (title) => mutate(() => ({ title })),

      markSaving: () => set({ saveStatus: "saving" }),
      markSaved: (revision) => set({ savedRevision: revision, saveStatus: "saved" }),
      markError: () => set({ saveStatus: "error" }),
    };
  });
}

export const EditorStoreContext = createContext<StoreApi<EditorState> | null>(null);

export function useEditorStoreApi(): StoreApi<EditorState> {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditor deve ser usado dentro de <EditorStoreContext.Provider>");
  return store;
}

export function useEditor<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditorStoreApi(), selector);
}
