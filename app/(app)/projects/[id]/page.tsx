import { ArrowLeft, Images, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CarouselCard } from "@/components/carousel/CarouselCard";
import { NewCarouselDialog } from "@/components/carousel/NewCarouselDialog";
import { ProjectSettings, ProjectTitle } from "@/components/projects/ProjectSettings";
import { EmptyState, PageContainer } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/plans";
import { listCarouselSummaries } from "@/lib/server/carousels";
import { getCreationOptions } from "@/lib/server/queries";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projeto" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const { supabase, profile } = session;

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, niche, brand_kit_id")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [options, carousels] = await Promise.all([
    getCreationOptions(supabase, getPlan(profile.plan).id),
    listCarouselSummaries(supabase, { projectId: id }),
  ]);

  const newButton = (
    <NewCarouselDialog {...options} fixedProjectId={project.id}>
      <Button size="lg" className="bg-gradient-brand h-11 px-5 font-semibold text-brand-dark hover:opacity-90">
        <Plus aria-hidden /> Novo carrossel
      </Button>
    </NewCarouselDialog>
  );

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4">
        <Link href="/projects">
          <ArrowLeft aria-hidden /> Projetos
        </Link>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 font-heading text-3xl font-black tracking-tight sm:text-4xl">
          <ProjectTitle id={project.id} title={project.title} />
        </h1>
        {newButton}
      </div>

      <section aria-label="Configurações do projeto" className="mt-8 rounded-2xl border border-white/10 bg-card/40 p-5">
        <ProjectSettings
          id={project.id}
          niche={project.niche}
          brandKitId={project.brand_kit_id}
          brandKits={options.brandKits}
        />
      </section>

      <section aria-labelledby="carrosseis" className="mt-12">
        <h2 id="carrosseis" className="text-xl font-bold">
          Carrosséis
        </h2>
        {carousels.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Images />}
              title="Nenhum carrossel neste projeto"
              description="Gere o primeiro: escreva um tema ou cole um link."
              action={newButton}
            />
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {carousels.map((carousel) => (
              <CarouselCard key={carousel.id} carousel={carousel} />
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
