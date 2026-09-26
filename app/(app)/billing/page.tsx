import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingActions } from "@/components/billing/BillingActions";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { Progress } from "@/components/ui/progress";
import { getPlan, isPlanId } from "@/lib/plans";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Plano e cobrança" };

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; plan?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const { profile } = session;
  const params = await searchParams;
  const plan = getPlan(profile.plan);

  const resetAt = new Date(profile.monthly_reset_at);
  const expired = resetAt.getTime() < Date.now() - 30 * 86_400_000;
  const used = expired ? 0 : profile.monthly_generations;
  const nextReset = new Date((expired ? Date.now() : resetAt.getTime()) + 30 * 86_400_000);
  const unlimited = plan.monthlyGenerations < 0;

  return (
    <PageContainer>
      <PageHeader title="Plano e cobrança" description="Escolha o plano ideal para o seu volume de conteúdo." />

      <section aria-label="Uso do mês" className="mt-8 rounded-2xl border border-white/10 bg-card/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold">
            Plano {plan.name}
            {profile.subscription_status && profile.subscription_status !== "active" ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">({profile.subscription_status})</span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {unlimited ? `${used} carrosséis gerados` : `${used} de ${plan.monthlyGenerations} carrosséis`} · renova em{" "}
            {dateFormat.format(nextReset)}
          </p>
        </div>
        {!unlimited ? (
          <Progress
            value={Math.min(100, (used / plan.monthlyGenerations) * 100)}
            className="mt-4 h-2"
            aria-label="Uso da quota mensal"
          />
        ) : null}
      </section>

      <div className="mt-10">
        <BillingActions
          currentPlan={plan.id}
          hasCustomer={Boolean(profile.stripe_customer_id)}
          status={params.success === "true" ? "success" : params.canceled === "true" ? "canceled" : null}
          highlight={isPlanId(params.plan) ? params.plan : null}
        />
      </div>
    </PageContainer>
  );
}
