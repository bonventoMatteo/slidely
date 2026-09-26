import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForm";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  config: "O Supabase ainda não foi configurado. Preencha o .env.local (veja o README).",
  auth: "O link de confirmação expirou ou é inválido. Entre ou peça um novo cadastro.",
  session: "Não foi possível carregar sua conta. Confira se as migrations do Supabase foram aplicadas e entre novamente.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="font-heading text-3xl font-black tracking-tight">Bem-vindo de volta</h1>
      <p className="mt-2 text-muted-foreground">Entre para continuar criando.</p>
      {error && ERRORS[error] ? (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {ERRORS[error]}
        </p>
      ) : null}
      <div className="mt-8">
        <LoginForm next={safeNextPath(next)} />
      </div>
    </>
  );
}
