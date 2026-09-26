import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { EditorShell } from "@/components/editor/EditorShell";
import { getPlan } from "@/lib/plans";
import { parseSlideRow, parseTheme } from "@/lib/schemas/carousel.zod";
import { listBrandKits } from "@/lib/server/queries";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editor" };

export default async function EditorPage({ params }: { params: Promise<{ carouselId: string }> }) {
  const { carouselId } = await params;
  if (!z.uuid().safeParse(carouselId).success) notFound();

  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const { supabase, user, profile } = session;

  const [{ data: carousel }, { data: slides, error }, brandKits] = await Promise.all([
    supabase
      .from("carousels")
      .select("id, title, theme, project_id, projects(title)")
      .eq("id", carouselId)
      .maybeSingle(),
    supabase
      .from("slides")
      .select("id, position, layout, content, image_url")
      .eq("carousel_id", carouselId)
      .order("position"),
    listBrandKits(supabase),
  ]);

  if (!carousel) notFound();
  if (error) throw new Error(`slides_query_failed: ${error.message}`);

  const plan = getPlan(profile.plan);
  const project = carousel.projects as { title: string } | null;

  return (
    <EditorShell
      initial={{
        carouselId: carousel.id,
        title: carousel.title ?? "Sem título",
        slides: (slides ?? []).map(parseSlideRow),
        theme: parseTheme(carousel.theme),
      }}
      userId={user.id}
      projectId={carousel.project_id}
      projectTitle={project?.title ?? "Projeto"}
      watermark={plan.watermark}
      pdfExport={plan.pdfExport}
      brandKits={brandKits}
    />
  );
}
