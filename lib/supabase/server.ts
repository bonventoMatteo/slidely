import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { logError } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { supabasePublicEnv } from "@/lib/public-env";
import type { Database, Tables } from "./database.types";

/** Cliente com a sessão do usuário (RLS aplicada). */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o middleware já renova a sessão.
        }
      },
    },
  });
}

/**
 * Cliente com service role — ignora RLS. Usar apenas em route handlers para
 * operações que o usuário não pode fazer diretamente (quota, logs, billing).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const { url } = supabasePublicEnv();
  return createSupabaseClient<Database>(url, serverEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SessionContext = {
  supabase: SupabaseClient<Database>;
  user: { id: string; email: string | null };
  profile: Tables<"profiles">;
};

/** Usuário + profile da requisição atual (memoizado por request). */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // Conta suspensa no painel de admin: bloqueia na hora, sem esperar o token expirar.
  const bannedUntil = (user as { banned_until?: string | null }).banned_until;
  if (bannedUntil && new Date(bannedUntil).getTime() > Date.now()) return null;

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    logError("profile_query_failed", { userId: user.id, err: error.message });
    return null;
  }
  if (profile) return { supabase, user: { id: user.id, email: user.email ?? null }, profile };

  // Usuário criado antes do trigger handle_new_user (ou trigger falhou): recria o profile.
  const healed = await ensureProfile(user.id, user.email ?? "", user.user_metadata);
  if (!healed) return null;
  return { supabase, user: { id: user.id, email: user.email ?? null }, profile: healed };
});

async function ensureProfile(
  userId: string,
  email: string,
  metadata: Record<string, unknown> | undefined,
): Promise<Tables<"profiles"> | null> {
  try {
    const fullName = typeof metadata?.full_name === "string" ? metadata.full_name : "";
    const { data, error } = await createAdminClient()
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName }, { onConflict: "id", ignoreDuplicates: false })
      .select("*")
      .single();
    if (error || !data) {
      logError("profile_heal_failed", { userId, err: error?.message });
      return null;
    }
    return data;
  } catch (err) {
    logError("profile_heal_failed", { userId, err });
    return null;
  }
}
