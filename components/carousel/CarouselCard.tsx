"use client";

import { MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FluidSlide } from "@/components/slide/FluidSlide";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Theme } from "@/lib/schemas/carousel.zod";
import type { EditorSlide } from "@/lib/schemas/carousel.zod";
import { createClient } from "@/lib/supabase/client";

export type CarouselCardData = {
  id: string;
  title: string;
  slideCount: number;
  updatedAt: string;
  cover: EditorSlide | null;
  theme: Theme;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function CarouselCard({ carousel }: { carousel: CarouselCardData }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  async function remove() {
    setHidden(true);
    const { error } = await createClient().from("carousels").delete().eq("id", carousel.id);
    if (error) {
      setHidden(false);
      toast.error("Não foi possível excluir o carrossel.");
      return;
    }
    toast.success("Carrossel excluído.");
    startTransition(() => router.refresh());
  }

  if (hidden) return null;

  return (
    <li className="group relative">
      <Link
        href={`/editor/${carousel.id}`}
        className="block overflow-hidden rounded-2xl border border-white/10 bg-card transition-all hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {carousel.cover ? (
          <FluidSlide
            slide={carousel.cover}
            theme={carousel.theme}
            position={1}
            total={carousel.slideCount}
            label={`Capa do carrossel ${carousel.title}`}
          />
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center text-sm text-muted-foreground">Sem slides</div>
        )}
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{carousel.title}</p>
          <p className="text-xs text-muted-foreground">
            {carousel.slideCount} slides · {dateFormat.format(new Date(carousel.updatedAt))}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${carousel.title}`}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
              <Trash2 aria-hidden /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir carrossel?</AlertDialogTitle>
            <AlertDialogDescription>
              “{carousel.title}” e todos os slides serão apagados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
