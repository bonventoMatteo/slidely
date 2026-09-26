import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { TemplatesGrid } from "@/components/templates/Grid";
import { getPlan } from "@/lib/plans";
import { getCreationOptions } from "@/lib/server/queries";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const options = await getCreationOptions(session.supabase, getPlan(session.profile.plan).id);

  return (
    <PageContainer>
      <PageHeader
        title="Templates"
        description={`${options.templates.length} visuais com prévia real. Escolha um e diga o tema.`}
      />
      <div className="mt-8">
        <TemplatesGrid {...options} />
      </div>
    </PageContainer>
  );
}
