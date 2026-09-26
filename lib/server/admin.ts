import "server-only";

import { notFound, redirect } from "next/navigation";
import { ApiError, logError, logInfo } from "@/lib/api";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient, getSession, type SessionContext } from "@/lib/supabase/server";

/** E-mails com acesso ao painel, separados por vírgula em ADMIN_EMAILS. */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().has(email!.toLowerCase());
}

/** Server Components: 404 para quem não é admin (não revela que o painel existe). */
export async function requireAdminPage(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login?error=session");
  if (!isAdminEmail(session.user.email)) notFound();
  return session;
}

/** Route handlers. */
export async function requireAdminApi(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "unauthorized", "Faça login para continuar.");
  if (!isAdminEmail(session.user.email)) throw new ApiError(404, "not_found", "Não encontrado.");
  return session;
}

export async function auditAdminAction(
  admin: SessionContext,
  target: { id: string; email: string | null },
  action: string,
  details: Record<string, Json> = {},
) {
  const entry = {
    admin_id: admin.user.id,
    admin_email: admin.user.email ?? "",
    target_user_id: target.id,
    target_email: target.email,
    action,
    details,
  };
  logInfo("admin_action", entry);
  const { error } = await createAdminClient().from("admin_audit_log").insert(entry);
  if (error) logError("admin_audit_failed", { ...entry, err: error.message });
}
