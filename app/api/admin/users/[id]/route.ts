import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleRouteError, readJson, zodErrorResponse } from "@/lib/api";
import { PLAN_IDS } from "@/lib/plans";
import { auditAdminAction, requireAdminApi } from "@/lib/server/admin";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const idSchema = z.string().uuid();

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_plan"), plan: z.enum(PLAN_IDS) }),
  z.object({ action: z.literal("reset_quota") }),
  z.object({ action: z.literal("set_usage"), used: z.number().int().min(0).max(100_000) }),
  /** days null = indefinidamente */
  z.object({ action: z.literal("suspend"), days: z.number().int().min(1).max(3650).nullable() }),
  z.object({ action: z.literal("unsuspend") }),
]);

async function loadTarget(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new ApiError(404, "user_not_found", "Usuário não encontrado.");
  const { data, error } = await createAdminClient().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new ApiError(500, "db_error", `Falha ao carregar usuário: ${error.message}`);
  if (!data) throw new ApiError(404, "user_not_found", "Usuário não encontrado.");
  return data;
}

/** PATCH /api/admin/users/:id — ações de suporte sobre a conta. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context: Record<string, unknown> = { route: "/api/admin/users/[id]" };
  try {
    const admin = await requireAdminApi();
    const { id } = await params;
    Object.assign(context, { adminId: admin.user.id, targetId: id });
    const target = await loadTarget(id);

    const parsed = actionSchema.safeParse(await readJson(request));
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;
    context.action = input.action;

    const db = createAdminClient();
    const ref = { id: target.id, email: target.email };

    switch (input.action) {
      case "set_plan": {
        const { error } = await db.from("profiles").update({ plan: input.plan }).eq("id", id);
        if (error) throw new ApiError(500, "db_error", `Falha ao trocar o plano: ${error.message}`);
        await auditAdminAction(admin, ref, "set_plan", { from: target.plan, to: input.plan });
        break;
      }
      case "reset_quota":
      case "set_usage": {
        const used = input.action === "reset_quota" ? 0 : input.used;
        const { error } = await db
          .from("profiles")
          .update({ monthly_generations: used, ...(input.action === "reset_quota" ? { monthly_reset_at: new Date().toISOString() } : {}) })
          .eq("id", id);
        if (error) throw new ApiError(500, "db_error", `Falha ao ajustar a quota: ${error.message}`);
        await auditAdminAction(admin, ref, input.action, { from: target.monthly_generations, to: used });
        break;
      }
      case "suspend": {
        if (id === admin.user.id) throw new ApiError(400, "self_action", "Você não pode suspender a própria conta.");
        const hours = input.days === null ? 876_000 : input.days * 24;
        const { error } = await db.auth.admin.updateUserById(id, { ban_duration: `${hours}h` });
        if (error) throw new ApiError(500, "auth_error", `Falha ao suspender: ${error.message}`);
        await auditAdminAction(admin, ref, "suspend", { days: input.days });
        break;
      }
      case "unsuspend": {
        const { error } = await db.auth.admin.updateUserById(id, { ban_duration: "none" });
        if (error) throw new ApiError(500, "auth_error", `Falha ao reativar: ${error.message}`);
        await auditAdminAction(admin, ref, "unsuspend");
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, context);
  }
}

/** DELETE /api/admin/users/:id — apaga a conta e todos os dados (cascade). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context: Record<string, unknown> = { route: "/api/admin/users/[id]", action: "delete" };
  try {
    const admin = await requireAdminApi();
    const { id } = await params;
    Object.assign(context, { adminId: admin.user.id, targetId: id });
    if (id === admin.user.id) throw new ApiError(400, "self_action", "Você não pode apagar a própria conta por aqui.");
    const target = await loadTarget(id);

    if (target.stripe_subscription_id && (ACTIVE_SUBSCRIPTION_STATUSES as Set<string>).has(target.subscription_status ?? "")) {
      throw new ApiError(
        409,
        "active_subscription",
        "Esse usuário tem assinatura ativa. Cancele no Stripe antes de apagar a conta.",
      );
    }

    const { error } = await createAdminClient().auth.admin.deleteUser(id);
    if (error) throw new ApiError(500, "auth_error", `Falha ao apagar: ${error.message}`);
    await auditAdminAction(admin, { id: target.id, email: target.email }, "delete_user", { plan: target.plan });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
