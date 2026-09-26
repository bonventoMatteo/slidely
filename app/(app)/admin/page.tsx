import { Ban, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UsageBars } from "@/components/admin/UsageBars";
import { PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatNumber, formatRelative, formatUSD } from "@/lib/format";
import { formatBRL, isPlanId, PLAN_IDS, PLANS } from "@/lib/plans";
import { requireAdminPage } from "@/lib/server/admin";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const SORTS = {
  recent: "Mais recentes",
  activity: "Última atividade",
  generations: "Mais gerações (30d)",
  cost: "Maior custo (30d)",
} as const;
type Sort = keyof typeof SORTS;

type Search = { q?: string; plan?: string; sort?: string; page?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPage();
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const plan = isPlanId(params.plan) ? params.plan : null;
  const sort: Sort = params.sort && params.sort in SORTS ? (params.sort as Sort) : "recent";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const db = createAdminClient();
  const [overviewRes, dailyRes, usersRes] = await Promise.all([
    db.rpc("admin_overview"),
    db.rpc("admin_daily_usage", { p_days: 30 }),
    db.rpc("admin_list_users", {
      p_search: q || null,
      p_plan: plan,
      p_sort: sort,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const error = overviewRes.error ?? dailyRes.error ?? usersRes.error;
  if (error) {
    return (
      <PageContainer>
        <PageHeader title="Admin" />
        <p className="mt-8 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
          Falha ao carregar os dados: {error.message}. Confira se a migration <code>0005_admin.sql</code> foi aplicada.
        </p>
      </PageContainer>
    );
  }

  const o = overviewRes.data?.[0];
  const users = usersRes.data ?? [];
  const total = Number(users[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mrr = Number(o?.plan_pro ?? 0) * PLANS.pro.priceBRL + Number(o?.plan_business ?? 0) * PLANS.business.priceBRL;

  const href = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { q, plan: plan ?? "", sort, page: String(page), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "page" && v === "1") && !(k === "sort" && v === "recent")) next.set(k, v);
    const qs = next.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

  const kpis = [
    { label: "Usuários", value: formatNumber(o?.total_users), hint: `+${formatNumber(o?.new_users_7d)} em 7 dias · +${formatNumber(o?.new_users_30d)} em 30` },
    { label: "Ativos (geraram algo)", value: formatNumber(o?.active_users_7d), hint: `7 dias · ${formatNumber(o?.active_users_30d)} em 30 dias` },
    { label: "MRR estimado", value: formatBRL(mrr), hint: `${formatNumber(o?.plan_pro)} Pro · ${formatNumber(o?.plan_business)} Business · ${formatNumber(o?.plan_free)} Free` },
    { label: "Custo de IA (30d)", value: formatUSD(o?.cost_30d), hint: `${formatNumber(o?.generations_30d)} gerações · ${formatNumber(o?.carousels_total)} carrosséis no total` },
  ];

  return (
    <PageContainer>
      <PageHeader title="Admin" description="Visão geral da plataforma e suporte aos usuários." />

      <section aria-label="Indicadores" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-white/10 bg-card/40 p-5">
            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 font-heading text-3xl font-black tabular-nums">{kpi.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <UsageBars
          label="Gerações por dia — últimos 30 dias"
          data={(dailyRes.data ?? []).map((d) => ({ day: d.day, generations: Number(d.generations), cost: Number(d.cost) }))}
        />
      </section>

      <section aria-labelledby="usuarios" className="mt-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="usuarios" className="text-xl font-bold">
            Usuários <span className="text-base font-normal text-muted-foreground">({formatNumber(total)})</span>
          </h2>
          <form action="/admin" className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input name="q" defaultValue={q} placeholder="E-mail, nome ou ID" aria-label="Buscar usuário" className="w-64 pl-9" />
            </div>
            <select
              name="plan"
              defaultValue={plan ?? ""}
              aria-label="Filtrar por plano"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Todos os planos</option>
              {PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} aria-label="Ordenar" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
            {q || plan || sort !== "recent" ? (
              <Button asChild variant="ghost">
                <Link href="/admin">Limpar</Link>
              </Button>
            ) : null}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-white/[0.03] text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 text-right font-medium">Quota do mês</th>
                <th className="px-4 py-3 text-right font-medium">Gerações 30d</th>
                <th className="px-4 py-3 text-right font-medium">Custo 30d</th>
                <th className="px-4 py-3 text-right font-medium">Carrosséis</th>
                <th className="px-4 py-3 font-medium">Última atividade</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const p = PLANS[isPlanId(u.plan) ? u.plan : "free"];
                  const banned = u.banned_until && new Date(u.banned_until).getTime() > Date.now();
                  const lastActivity = [u.last_generation_at, u.last_sign_in_at].filter(Boolean).sort().at(-1) ?? null;
                  return (
                    <tr key={u.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`} className="block font-medium hover:text-primary hover:underline">
                          {u.email}
                        </Link>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {banned ? (
                            <Badge variant="destructive">
                              <Ban aria-hidden /> Suspenso
                            </Badge>
                          ) : null}
                          {u.full_name || "sem nome"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.id === "free" ? "outline" : "secondary"}>{p.name}</Badge>
                        {u.subscription_status && u.subscription_status !== "active" ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">{u.subscription_status}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {u.monthly_generations}/{p.monthlyGenerations < 0 ? "∞" : p.monthlyGenerations}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(u.generations_30d)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatUSD(u.cost_30d)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(u.carousels)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatRelative(lastActivity)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 ? (
          <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {pages}
            </span>
            <div className="flex gap-2">
              <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>
                {page > 1 ? (
                  <Link href={href({ page: String(page - 1) })}>
                    <ChevronLeft aria-hidden /> Anterior
                  </Link>
                ) : (
                  <span>
                    <ChevronLeft aria-hidden /> Anterior
                  </span>
                )}
              </Button>
              <Button asChild={page < pages} variant="outline" size="sm" disabled={page >= pages}>
                {page < pages ? (
                  <Link href={href({ page: String(page + 1) })}>
                    Próxima <ChevronRight aria-hidden />
                  </Link>
                ) : (
                  <span>
                    Próxima <ChevronRight aria-hidden />
                  </span>
                )}
              </Button>
            </div>
          </nav>
        ) : null}
      </section>
    </PageContainer>
  );
}
