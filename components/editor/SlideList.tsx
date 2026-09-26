"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { SlidePreview } from "@/components/slide/SlidePreview";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EditorSlide, Theme } from "@/lib/schemas/carousel.zod";
import { MAX_SLIDES, MIN_SLIDES } from "@/lib/schemas/generate.zod";
import { useEditor } from "@/lib/stores/editor.store";
import { cn } from "@/lib/utils";
import { useEditorMeta } from "./EditorContext";

const THUMB_WIDTH = 132;

function SortableThumb({
  slide,
  index,
  total,
  theme,
  active,
  watermark,
  canRemove,
  canAdd,
}: {
  slide: EditorSlide;
  index: number;
  total: number;
  theme: Theme;
  active: boolean;
  watermark: boolean;
  canRemove: boolean;
  canAdd: boolean;
}) {
  const select = useEditor((s) => s.select);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const removeSlide = useEditor((s) => s.removeSlide);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative flex items-start gap-1", isDragging && "z-10 opacity-80")}
    >
      <div className="flex w-5 flex-col items-center pt-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
        {index + 1}
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="mt-2 cursor-grab rounded p-0.5 opacity-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
          aria-label={`Reordenar slide ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={() => select(index)}
        aria-label={`Editar slide ${index + 1}`}
        aria-current={active ? "true" : undefined}
        className={cn(
          "overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active ? "border-primary" : "border-transparent hover:border-white/20",
        )}
      >
        <SlidePreview slide={slide} theme={theme} position={index + 1} total={total} width={THUMB_WIDTH} watermark={watermark} />
      </button>
      <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={`Duplicar slide ${index + 1}`}
              disabled={!canAdd}
              onClick={() => duplicateSlide(slide.id)}
            >
              <Copy aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Duplicar</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon-xs"
              variant="secondary"
              aria-label={`Remover slide ${index + 1}`}
              disabled={!canRemove}
              onClick={() => removeSlide(slide.id)}
            >
              <Trash2 aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{canRemove ? "Remover" : `Mínimo de ${MIN_SLIDES} slides`}</TooltipContent>
        </Tooltip>
      </div>
    </li>
  );
}

export function SlideList() {
  const slides = useEditor((s) => s.slides);
  const theme = useEditor((s) => s.theme);
  const currentIndex = useEditor((s) => s.currentIndex);
  const reorder = useEditor((s) => s.reorder);
  const addSlide = useEditor((s) => s.addSlide);
  const { watermark } = useEditorMeta();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) {
      reorder(String(event.active.id), String(event.over.id));
    }
  }

  const canAdd = slides.length < MAX_SLIDES;
  const canRemove = slides.length > MIN_SLIDES;

  return (
    <aside aria-label="Slides" className="flex w-[196px] shrink-0 flex-col border-r border-white/5 bg-sidebar/60">
      <ScrollArea className="min-h-0 flex-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-3 p-3">
              {slides.map((slide, index) => (
                <SortableThumb
                  key={slide.id}
                  slide={slide}
                  index={index}
                  total={slides.length}
                  theme={theme}
                  active={index === currentIndex}
                  watermark={watermark}
                  canAdd={canAdd}
                  canRemove={canRemove}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </ScrollArea>
      <div className="border-t border-white/5 p-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!canAdd}
          onClick={() => addSlide(currentIndex)}
        >
          <Plus aria-hidden /> Adicionar slide
        </Button>
        {!canAdd ? <p className="mt-2 text-center text-[11px] text-muted-foreground">Máximo de {MAX_SLIDES} slides</p> : null}
      </div>
    </aside>
  );
}
