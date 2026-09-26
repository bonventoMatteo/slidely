import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandKitsManager } from "@/components/brand-kit/BrandKitsManager";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { getPlan } from "@/lib/plans";
import { listBrandKits } from "@/lib/server/queries";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Brand kits" };

export default async function BrandKitsPage() {
  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const plan = getPlan(session.profile.plan);
  const kits = await listBrandKits(session.supabase);

  return (
    <PageContainer>
      <PageHeader title="Brand kits" description="A identidade da sua marca aplicada em todos os carrosséis." />
      <div className="mt-8">
        <BrandKitsManager initialKits={kits} limit={plan.brandKits} planName={plan.name} userId={session.user.id} />
      </div>
    </PageContainer>
  );
}
