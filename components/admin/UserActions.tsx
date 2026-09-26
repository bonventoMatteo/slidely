"use client";

import { Ban, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/fetch-json";
import { PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";

const SUSPEND_OPTIONS = [
  { value: "1", label: "1 dia" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "", label: "Indefinidamente" },
];

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function UserActions({
  userId,
  email,
  plan,
  used,
  banned,
  isSelf,
  hasActiveSubscription,
}: {
  userId: string;
  email: string;
  plan: PlanId;
  used: number;
  banned: boolean;
  isSelf: boolean;
  hasActiveSubscription: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState<PlanId>(plan);
  const [usage, setUsage] = useState(String(used));
  const [suspendDays, setSuspendDays] = useState("7");
  const [confirmEmail, setConfirmEmail] = useState("");
  const url = `/api/admin/users/${userId}`;

  async function run(key: string, body: unknown, success: string) {
    setBusy(key);
    try {
      await requestJson("PATCH", url, body);
      toast.success(success);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar a ação.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      await requestJson("DELETE", url);
      toast.success("Conta apagada.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao apagar a conta.");
      setBusy(null);
    }
  }

  const spinner = (key: string) => (busy === key ? <Loader2 className="animate-spin" aria-hidden /> : null);

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-card/40 p-5 text-sm">
      <h2 className="font-bold">Ações</h2>

      <div className="space-y-2">
        <Label htmlFor="admin-plan">Plano</Label>
        <div className="flex gap-2">
          <select id="admin-plan" className={selectClass} value={nextPlan} onChange={(e) => setNextPlan(e.target.value as PlanId)}>
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={busy !== null || nextPlan === plan}
            onClick={() => run("plan", { action: "set_plan", plan: nextPlan }, `Plano alterado para ${PLANS[nextPlan].name}.`)}
          >
            {spinner("plan")} Salvar
          </Button>
        </div>
        {hasActiveSubscription ? (
          <p className="text-xs text-muted-foreground">
            Tem assinatura no Stripe: a próxima atualização da assinatura sobrescreve o plano definido aqui.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-usage">Gerações usadas no mês</Label>
        <div className="flex gap-2">
          <Input id="admin-usage" type="number" min={0} value={usage} onChange={(e) => setUsage(e.target.value)} />
          <Button
            variant="outline"
            disabled={busy !== null || usage === "" || Number(usage) === used}
            onClick={() => run("usage", { action: "set_usage", used: Number(usage) }, "Uso ajustado.")}
          >
            {spinner("usage")} Salvar
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-0"
          disabled={busy !== null}
          onClick={() => run("reset", { action: "reset_quota" }, "Quota zerada e ciclo reiniciado.")}
        >
          {spinner("reset") ?? <RotateCcw aria-hidden />} Zerar quota e reiniciar o ciclo
        </Button>
      </div>

      <div className="space-y-2 border-t border-white/5 pt-5">
        {banned ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={busy !== null}
            onClick={() => run("unsuspend", { action: "unsuspend" }, "Conta reativada.")}
          >
            {spinner("unsuspend") ?? <ShieldCheck aria-hidden />} Reativar conta
          </Button>
        ) : (
          <>
            <Label htmlFor="admin-suspend">Suspender acesso</Label>
            <div className="flex gap-2">
              <select id="admin-suspend" className={selectClass} value={suspendDays} onChange={(e) => setSuspendDays(e.target.value)}>
                {SUSPEND_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={busy !== null || isSelf}
                onClick={() =>
                  run("suspend", { action: "suspend", days: suspendDays ? Number(suspendDays) : null }, "Conta suspensa.")
                }
              >
                {spinner("suspend") ?? <Ban aria-hidden />} Suspender
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-white/5 pt-5">
        <AlertDialog onOpenChange={(open) => !open && setConfirmEmail("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={busy !== null || isSelf}>
              <Trash2 aria-hidden /> Apagar conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar esta conta?</AlertDialogTitle>
              <AlertDialogDescription>
                Remove o usuário, projetos, carrosséis, brand kits e o histórico de uso. Não dá para desfazer. Digite{" "}
                <strong className="break-all text-foreground">{email}</strong> para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} aria-label="Confirme o e-mail" autoComplete="off" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button variant="destructive" disabled={confirmEmail.trim() !== email || busy !== null} onClick={remove}>
                {spinner("delete")} Apagar definitivamente
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
