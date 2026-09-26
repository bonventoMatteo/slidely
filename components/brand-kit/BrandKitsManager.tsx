"use client";

import { MoreHorizontal, Palette, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/PageHeader";
import { SlidePreview } from "@/components/slide/SlidePreview";
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
import { DEFAULT_THEME } from "@/lib/schemas/carousel.zod";
import { createClient } from "@/lib/supabase/client";
import type { BrandKitOption } from "@/lib/types";
import { BrandKitEditor } from "./Editor";

export function BrandKitsManager({
  initialKits,
  limit,
  planName,
  userId,
}: {
  initialKits: BrandKitOption[];
  limit: number;
  planName: string;
  userId: string;
}) {
  const router = useRouter();
  const [kits, setKits] = useState(initialKits);
  const [editing, setEditing] = useState<BrandKitOption | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<BrandKitOption | null>(null);
  const atLimit = kits.length >= limit;

  function limitToast() {
    toast.error(`O plano ${planName} permite ${limit} brand kit(s).`, {
      action: { label: "Fazer upgrade", onClick: () => router.push("/billing") },
    });
  }

  function openNew() {
    if (atLimit) return limitToast();
    setEditing(null);
    setEditorOpen(true);
  }

  async function remove(kit: BrandKitOption) {
    const snapshot = kits;
    setKits((prev) => prev.filter((k) => k.id !== kit.id));
    const { error } = await createClient().from("brand_kits").delete().eq("id", kit.id);
    if (error) {
      setKits(snapshot);
      toast.error("Não foi possível excluir o brand kit.");
      return;
    }
    toast.success("Brand kit excluído.");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {kits.length} de {limit} no plano {planName}
          {atLimit ? (
            <>
              {" · "}
              <Link href="/billing" className="font-medium text-primary hover:underline">
                Fazer upgrade
              </Link>
            </>
          ) : null}
        </p>
        <Button size="lg" className="h-11 px-5 font-semibold" onClick={openNew} aria-disabled={atLimit}>
          <Plus aria-hidden /> Novo brand kit
        </Button>
      </div>

      {kits.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Palette />}
            title="Crie seu primeiro brand kit"
            description="Salve cores, fontes, @ e logo da sua marca para aplicar em qualquer carrossel com 1 clique."
            action={<Button onClick={openNew}>Criar brand kit</Button>}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => (
            <li key={kit.id} className="rounded-2xl border border-white/10 bg-card/50 p-4">
              <div className="flex gap-4">
                <div className="overflow-hidden rounded-lg ring-1 ring-white/10">
                  <SlidePreview
                    slide={{ layout: "bold-hook", content: { role: "hook", hook: kit.name, title: "", body: "" }, image_url: null }}
                    theme={{ ...DEFAULT_THEME, colors: kit.colors, fonts: kit.fonts, handle: kit.handle, logoUrl: kit.logoUrl }}
                    position={1}
                    total={7}
                    width={96}
                    label={`Prévia do brand kit ${kit.name}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{kit.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${kit.name}`}>
                          <MoreHorizontal aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(kit);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil aria-hidden /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(kit)}>
                          <Trash2 aria-hidden /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {kit.handle ? `@${kit.handle}` : "Sem @"} · {kit.fonts.heading}
                  </p>
                  <div className="mt-3 flex gap-1.5" aria-label="Cores">
                    {Object.entries(kit.colors).map(([key, color]) => (
                      <span
                        key={key}
                        title={`${key}: ${color}`}
                        className="size-6 rounded-md border border-white/15"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BrandKitEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        kit={editing}
        userId={userId}
        onLimitReached={limitToast}
        onSaved={(saved) => {
          setKits((prev) => (prev.some((k) => k.id === saved.id) ? prev.map((k) => (k.id === saved.id ? saved : k)) : [...prev, saved]));
          router.refresh();
        }}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir brand kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Carrosséis já criados mantêm as cores atuais. Projetos que usavam “{toDelete?.name}” ficam sem brand kit padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => toDelete && remove(toDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
