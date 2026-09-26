import { ArrowLeft, Ban, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UsageBars } from "@/components/admin/UsageBars";
import { UserActions } from "@/components/admin/UserActions";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber, formatRelative, formatUSD } from "@/lib/format";
import { getPlan } from "@/lib/plans";
import { isAdminEmail, requireAdminPage } from "@/lib/server/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Usuário · Admin" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTION_LABELS: Record<string, string> = {
  set_plan: "Plano alterado",
  reset_quota: "Quota zerada",
  set_usage: "Uso ajustado",
  suspend: "Conta suspensa",
  unsuspend: "Conta reativada",
};

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/40 p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-black tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminPage();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [authRes, statsRes, dailyRes, carouselsRes, projectsRes, brandKitsRes, logRes, auditRes] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.rpc("admin_list_users", { p_search: id, p_limit: 1 }),
    db.rpc("admin_daily_usage", { p_user_id: id, p_days: 30 }),
    db
      .from("carousels")
      .select("id, title, prompt, status, tone, slide_count, source_url, error_message, created_at", { count: "exact" })
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("projects").select("id", { count: "exact", head: true }).eq("user_id", id),
    db.from("brand_kits").select("id", { count: "exact", head: true }).eq("user_id", id),
    db
      .from("generations_log")
      .select("id, kind, model, tokens_input, tokens_output, cost_usd, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    db.from("admin_audit_log").select("*").eq("target_user_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  const authUser = authRes.data.user;
  const stats = statsRes.data?.[0];
  const plan = getPlan(profile.plan);
  const bannedUntil = authUser?.banned_until ?? null;
  const banned = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
  const resetDue = new Date(profile.monthly_reset_at).getTime() < Date.now() - 30 * 86_400_000;
  const used = resetDue ? 0 : profile.monthly_generations;
  const nextReset = new Date(new Date(profile.monthly_reset_at).getTime() + 30 * 86_400_000).toISOString();
  const provider = authUser?.app_metadata?.provider as string | undefined;
  const carousels = carouselsRes.data ?? [];
  const failed = carousels.filter((c) => c.status === "error").length;

  return (
    <PageContainer>
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Voltar para usuários
      </Link>

      <div className="mt-4">
        <PageHeader
          title={<span className="break-all">{profile.email}</span>}
          description={
            <span className="flex flex-wrap items-center gap-2">
              {profile.full_name || "sem nome"}
              <Badge variant={plan.id === "free" ? "outline" : "secondary"}>{plan.name}</Badge>
              {profile.subscription_status ? <Badge variant="outline">Stripe: {profile.subscription_status}</Badge> : null}
              {banned ? (
                <Badge variant="destructive">
                  <Ban aria-hidden /> Suspenso até {formatDate(bannedUntil, true)}
                </Badge>
              ) : null}
              {isAdminEmail(profile.email) ? <Badge>Admin</Badge> : null}
              {authUser && !authUser.email_confirmed_at ? <Badge variant="outline">E-mail não confirmado</Badge> : null}
            </span>
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Quota do mês"
              value={`${used}/${plan.monthlyGenerations < 0 ? "∞" : plan.monthlyGenerations}`}
              hint={`renova em ${formatDate(nextReset)}`}
            />
            <Stat label="Gerações 30d" value={formatNumber(stats?.generations_30d)} hint={`última ${formatRelative(stats?.last_generation_at)}`} />
            <Stat label="Custo de IA 30d" value={formatUSD(stats?.cost_30d)} hint={`total ${formatUSD(stats?.cost_total)}`} />
            <Stat
              label="Receita/mês"
              value={plan.priceBRL ? `R$${plan.priceBRL}` : "R$0"}
              hint={plan.priceBRL ? "plano pago" : "plano gratuito"}
            />
            <Stat label="Carrosséis" value={formatNumber(carouselsRes.count)} hint={failed ? `${failed} com erro nos últimos 20` : undefined} />
            <Stat label="Projetos" value={formatNumber(projectsRes.count)} />
            <Stat label="Brand kits" value={`${formatNumber(brandKitsRes.count)}/${plan.brandKits}`} />
            <Stat label="Último login" value={<span className="text-lg">{formatRelative(authUser?.last_sign_in_at)}</span>} hint={provider ? `via ${provider}` : undefined} />
          </section>

          <UsageBars
            label="Gerações por dia — últimos 30 dias"
            data={(dailyRes.data ?? []).map((d) => ({ day: d.day, generations: Number(d.generations), cost: Number(d.cost) }))}
          />

          <section aria-labelledby="carrosseis" className="rounded-2xl border border-white/10 bg-card/40">
            <h2 id="carrosseis" className="border-b border-white/5 px-5 py-4 font-bold">
              Carrosséis recentes
            </h2>
            {carousels.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum carrossel ainda.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {carousels.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-medium">{c.title || "Sem título"}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(c.created_at, true)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{c.prompt}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={c.status === "error" ? "destructive" : "outline"}>{c.status}</Badge>
                      {c.slide_count} slides · {c.tone}
                      {c.source_url ? (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                          fonte <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                      {c.error_message ? <span className="text-destructive">{c.error_message}</span> : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="geracoes" className="rounded-2xl border border-white/10 bg-card/40">
            <h2 id="geracoes" className="border-b border-white/5 px-5 py-4 font-bold">
              Chamadas de IA
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2 font-medium">Quando</th>
                    <th className="px-5 py-2 font-medium">Tipo</th>
                    <th className="px-5 py-2 font-medium">Modelo</th>
                    <th className="px-5 py-2 text-right font-medium">Tokens (in/out)</th>
                    <th className="px-5 py-2 text-right font-medium">Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(logRes.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                        Nenhuma chamada registrada.
                      </td>
                    </tr>
                  ) : (
                    (logRes.data ?? []).map((g) => (
                      <tr key={g.id}>
                        <td className="px-5 py-2 text-muted-foreground">{formatDate(g.created_at, true)}</td>
                        <td className="px-5 py-2">{g.kind === "carousel" ? "Carrossel" : "Slide"}</td>
                        <td className="px-5 py-2 font-mono text-xs">{g.model}</td>
                        <td className="px-5 py-2 text-right tabular-nums">
                          {formatNumber(g.tokens_input)}/{formatNumber(g.tokens_output)}
                        </td>
                        <td className="px-5 py-2 text-right tabular-nums">{formatUSD(g.cost_usd, 4)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <UserActions
            userId={profile.id}
            email={profile.email}
            plan={plan.id}
            used={used}
            banned={banned}
            isSelf={profile.id === session.user.id}
            hasActiveSubscription={Boolean(profile.stripe_subscription_id)}
          />

          <section className="rounded-2xl border border-white/10 bg-card/40 p-5 text-sm">
            <h2 className="font-bold">Conta</h2>
            <dl className="mt-3 space-y-2">
              {[
                ["ID", <code key="id" className="break-all text-xs">{profile.id}</code>],
                ["Cadastro", formatDate(profile.created_at, true)],
                ["Último login", formatDate(authUser?.last_sign_in_at, true)],
                ["E-mail confirmado", formatDate(authUser?.email_confirmed_at, true)],
                [
                  "Cliente Stripe",
                  profile.stripe_customer_id ? (
                    <a
                      key="stripe"
                      href={`https://dashboard.stripe.com/customers/${profile.stripe_customer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {profile.stripe_customer_id} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    "—"
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-white/10 bg-card/40 p-5 text-sm">
            <h2 className="font-bold">Histórico de admin</h2>
            {(auditRes.data ?? []).length === 0 ? (
              <p className="mt-3 text-muted-foreground">Nenhuma ação registrada.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(auditRes.data ?? []).map((a) => (
                  <li key={a.id}>
                    <p className="font-medium">{ACTION_LABELS[a.action] ?? a.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.created_at, true)} · {a.admin_email}
                      {a.details && typeof a.details === "object" && !Array.isArray(a.details) && Object.keys(a.details).length
                        ? ` · ${Object.entries(a.details)
                            .map(([k, v]) => `${k}: ${v ?? "∞"}`)
                            .join(", ")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
