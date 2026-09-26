import "server-only";

import { ApiError } from "@/lib/api";
import { getSession, createAdminClient, type SessionContext } from "@/lib/supabase/server";

/** Exige usuário autenticado em route handlers. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "unauthorized", "Faça login para continuar.");
  return session;
}

/**
 * Rate limit por usuário via Postgres (janela deslizante).
 * Lança 429 quando excedido.
 */
export async function enforceRateLimit(
  userId: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
  message = "Muitas requisições. Aguarde um minuto e tente novamente.",
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_user_id: userId,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    throw new ApiError(500, "rate_limit_error", `Falha ao verificar limite de uso: ${error.message}`);
  }
  if (data === false) {
    throw new ApiError(429, "rate_limited", message, { "Retry-After": String(Math.min(windowSeconds, 60)) });
  }
}
