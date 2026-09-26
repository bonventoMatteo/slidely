import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectsList, type ProjectRow } from "@/components/projects/ProjectsList";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login?error=session");

  const { data, error } = await session.supabase
    .from("projects")
    .select("id, title, niche, updated_at, carousels(count)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`projects_query_failed: ${error.message}`);

  const projects: ProjectRow[] = (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    niche: p.niche,
    updatedAt: p.updated_at,
    carouselCount: p.carousels[0]?.count ?? 0,
  }));

  return (
    <PageContainer>
      <PageHeader title="Projetos" description="Organize seus carrosséis por cliente, campanha ou assunto." />
      <div className="mt-8">
        <ProjectsList initialProjects={projects} userId={session.user.id} />
      </div>
    </PageContainer>
  );
}
