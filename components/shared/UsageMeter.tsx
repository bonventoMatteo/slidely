import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import type { ShellUser } from "./nav";

export function UsageMeter({ user }: { user: ShellUser }) {
  const unlimited = user.limit < 0;
  const pct = unlimited ? 100 : Math.min(100, Math.round((user.used / Math.max(user.limit, 1)) * 100));
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">Plano {user.planName}</span>
        <span className="text-muted-foreground">
          {unlimited ? "Ilimitado" : `${user.used}/${user.limit}`}
        </span>
      </div>
      <Progress value={pct} className="mt-2 h-1.5" aria-label="Carrosséis usados no mês" />
      {user.plan === "free" ? (
        <Link href="/billing" className="mt-2 block text-xs font-medium text-primary hover:underline">
          Fazer upgrade
        </Link>
      ) : null}
    </div>
  );
}
