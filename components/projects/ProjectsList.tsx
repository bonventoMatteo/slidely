"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FolderKanban, FolderPlus, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/PageHeader";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { projectInputSchema, type ProjectInput } from "@/lib/schemas/project.zod";
import { createClient } from "@/lib/supabase/client";
import { InlineRename } from "./InlineRename";

export type ProjectRow = { id: string; title: string; niche: string | null; carouselCount: number; updatedAt: string };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function ProjectsList({ initialProjects, userId }: { initialProjects: ProjectRow[]; userId: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectRow | null>(null);

  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectInputSchema),
    defaultValues: { title: "", niche: "" },
  });

  async function create(values: ProjectInput) {
    const { data, error } = await createClient()
      .from("projects")
      .insert({ user_id: userId, title: values.title, niche: values.niche || null })
      .select("id, title, niche, updated_at")
      .single();
    if (error || !data) {
      toast.error("Não foi possível criar o projeto.");
      return;
    }
    setProjects((prev) => [{ id: data.id, title: data.title, niche: data.niche, carouselCount: 0, updatedAt: data.updated_at }, ...prev]);
    setCreateOpen(false);
    form.reset();
    toast.success("Projeto criado.");
    router.push(`/projects/${data.id}`);
  }

  async function rename(id: string, title: string): Promise<boolean> {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
    const { error } = await createClient().from("projects").update({ title }).eq("id", id);
    if (error) {
      toast.error("Não foi possível renomear.");
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title: initialProjects.find((i) => i.id === id)?.title ?? p.title } : p)));
      return false;
    }
    return true;
  }

  async function remove(project: ProjectRow) {
    const snapshot = projects;
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    const { error } = await createClient().from("projects").delete().eq("id", project.id);
    if (error) {
      setProjects(snapshot);
      toast.error("Não foi possível excluir o projeto.");
      return;
    }
    toast.success("Projeto excluído.");
    router.refresh();
  }

  const createButton = (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 px-5 font-semibold">
          <FolderPlus aria-hidden /> Novo projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Agrupe carrosséis por cliente, campanha ou assunto.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="create-project" onSubmit={form.handleSubmit(create)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Campanha de lançamento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="niche"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nicho (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: nutrição esportiva" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form="create-project" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Criar projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <div className="flex justify-end">{createButton}</div>
      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<FolderKanban />}
            title="Nenhum projeto ainda"
            description="Projetos são criados automaticamente quando você gera um carrossel, ou você pode criar um agora."
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id} className="group relative rounded-2xl border border-white/10 bg-card/50 p-5 transition-colors hover:border-white/20">
              <div className="flex items-start justify-between gap-2">
                <InlineRename
                  value={project.title}
                  onCommit={(title) => rename(project.id, title)}
                  className="min-w-0 text-base font-semibold"
                  inputClassName="h-8"
                  label={`Renomear ${project.title}`}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${project.title}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(project)}>
                      <Trash2 aria-hidden /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{project.niche || "Sem nicho definido"}</p>
              <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {project.carouselCount} {project.carouselCount === 1 ? "carrossel" : "carrosséis"}
                </span>
                <span>{dateFormat.format(new Date(project.updatedAt))}</span>
              </div>
              <Link
                href={`/projects/${project.id}`}
                className="mt-4 inline-flex text-sm font-medium text-primary hover:underline focus-visible:underline"
              >
                Abrir projeto
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” e todos os carrosséis dele serão apagados. Essa ação não pode ser desfeita.
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
