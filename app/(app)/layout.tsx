import { redirect } from "next/navigation";
import { Header } from "@/components/shared/Header";
import type { ShellUser } from "@/components/shared/nav";
import { Sidebar } from "@/components/shared/Sidebar";
import { getPlan } from "@/lib/plans";
import { getSession } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?error=session");

  const { profile } = session;
  const plan = getPlan(profile.plan);
  const resetDue = new Date(profile.monthly_reset_at).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000;
  const user: ShellUser = {
    email: profile.email,
    fullName: profile.full_name ?? "",
    plan: plan.id,
    planName: plan.name,
    used: resetDue ? 0 : profile.monthly_generations,
    limit: plan.monthlyGenerations,
  };

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <div id="conteudo" className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
