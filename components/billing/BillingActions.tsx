"use client";

import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/fetch-json";
import { formatBRL, PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function BillingActions({
  currentPlan,
  hasCustomer,
  status,
  highlight,
}: {
  currentPlan: PlanId;
  hasCustomer: boolean;
  status: "success" | "canceled" | null;
  highlight: PlanId | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const notified = useRef(false);

  // Retorno do Checkout: o webhook pode levar alguns segundos para atualizar o plano.
  useEffect(() => {
    if (notified.current || !status) return;
    notified.current = true;
    if (status === "canceled") {
      toast.info("Checkout cancelado. Nada foi cobrado.");
      return;
    }
    toast.success("Pagamento confirmado! Atualizando seu plano…");
    if (currentPlan !== "free") return;
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 6) window.clearInterval(id);
    }, 2500);
    return () => window.clearInterval(id);
  }, [status, currentPlan, router]);

  async function go(url: string, body: unknown, key: string) {
    setLoading(key);
    try {
      const { url: redirect } = await postJson<{ url: string }>(url, body);
      window.location.assign(redirect);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o pagamento.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const plan = PLANS[id];
          const isCurrent = id === currentPlan;
          const featured = highlight ? id === highlight : id === "pro";
          return (
            <div
              key={id}
              className={cn(
                "relative flex flex-col rounded-3xl border p-6",
                featured && !isCurrent ? "border-primary/50 bg-gradient-to-b from-primary/10 to-card/40" : "border-white/10 bg-card/40",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                {isCurrent ? <Badge variant="secondary">Plano atual</Badge> : null}
              </div>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-black">{plan.priceBRL === 0 ? "R$0" : formatBRL(plan.priceBRL)}</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              {id === "free" ? (
                <Button variant="outline" className="mt-6" disabled>
                  {isCurrent ? "Seu plano" : "Incluído"}
                </Button>
              ) : (
                <Button
                  className={cn("mt-6", featured && !isCurrent && "bg-gradient-brand text-brand-dark hover:opacity-90")}
                  variant={isCurrent ? "outline" : "default"}
                  disabled={loading !== null || isCurrent}
                  onClick={() => go("/api/stripe/checkout", { plan: id }, id)}
                >
                  {loading === id ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  {isCurrent ? "Plano atual" : currentPlan === "free" ? `Assinar ${plan.name}` : `Mudar para ${plan.name}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {hasCustomer ? (
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-card/40 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold">Gerenciar assinatura</p>
            <p className="text-sm text-muted-foreground">Troque o cartão, baixe notas fiscais ou cancele quando quiser.</p>
          </div>
          <Button variant="outline" disabled={loading !== null} onClick={() => go("/api/stripe/portal", {}, "portal")}>
            {loading === "portal" ? <Loader2 className="animate-spin" aria-hidden /> : <ExternalLink aria-hidden />}
            Abrir portal de pagamento
          </Button>
        </div>
      ) : null}
    </div>
  );
}
