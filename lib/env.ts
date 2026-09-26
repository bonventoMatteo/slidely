import "server-only";
import { z } from "zod";

/**
 * Variáveis server-only, validadas sob demanda (não quebra o build quando uma
 * integração opcional ainda não foi configurada).
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-4-5"),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_PRO: z.string().min(1),
  STRIPE_PRICE_BUSINESS: z.string().min(1),
});

type ServerEnv = z.infer<typeof serverSchema>;

export function serverEnv<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
  const raw = process.env[key];
  const parsed = serverSchema.shape[key].safeParse(raw === "" ? undefined : raw);
  if (!parsed.success) {
    throw new Error(`Variável de ambiente ausente ou inválida: ${key}`);
  }
  return parsed.data as ServerEnv[K];
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
