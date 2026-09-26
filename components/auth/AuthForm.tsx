"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { AuthError } from "@supabase/supabase-js";
import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { logClientError } from "@/lib/client-log";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(72),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Esse e-mail já tem conta. Faça login.",
  email_exists: "Esse e-mail já tem conta. Faça login.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  over_email_send_rate_limit: "Limite de envio de e-mails atingido. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos.",
  email_address_not_authorized:
    "O envio de e-mails do servidor ainda não está liberado para esse endereço. Avise o suporte (SMTP não configurado).",
  email_address_invalid: "Esse e-mail não é aceito. Use outro endereço.",
  signup_disabled: "Novos cadastros estão temporariamente desativados.",
  unexpected_failure: "Falha no servidor de autenticação. Tente novamente em instantes.",
};

/** Traduz erros do Supabase Auth; nunca esconde a causa quando ela é desconhecida. */
function translateAuthError(error: AuthError): string {
  logClientError("auth_error", error, { code: error.code, status: error.status });
  if (error.code && AUTH_ERRORS[error.code]) return AUTH_ERRORS[error.code];
  const m = error.message.toLowerCase();
  if (m.includes("invalid login credentials")) return AUTH_ERRORS.invalid_credentials;
  if (m.includes("email not confirmed")) return AUTH_ERRORS.email_not_confirmed;
  if (m.includes("already registered")) return AUTH_ERRORS.user_already_exists;
  if (m.includes("not authorized")) return AUTH_ERRORS.email_address_not_authorized;
  if (m.includes("sending") && m.includes("email")) return EMAIL_SEND_FAILED;
  if (error.status && error.status >= 500) return AUTH_ERRORS.unexpected_failure;
  if (m.includes("database error")) return "Erro ao criar a conta no banco. Verifique as migrations do Supabase.";
  if (m.includes("rate limit")) return AUTH_ERRORS.over_request_rate_limit;
  return `Não foi possível concluir: ${error.message}`;
}

const EMAIL_SEND_FAILED =
  "Não conseguimos enviar o e-mail de confirmação agora. Tente de novo em alguns minutos ou fale com o suporte.";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: LoginValues) {
    const { error } = await createClient().auth.signInWithPassword(values);
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="voce@email.com" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Entrar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </form>
    </Form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupValues) {
    const origin = window.location.origin;
    const { data, error } = await createClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      toast.error(translateAuthError(error));
      return;
    }
    if (data.session) {
      // Confirmação de e-mail desativada no projeto: já entra direto.
      router.replace(next);
      router.refresh();
      return;
    }
    setSentTo(values.email);
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card/60 p-6 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
        <h2 className="mt-4 text-lg font-bold">Confirme seu e-mail</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enviamos um link para <span className="font-medium text-foreground">{sentTo}</span>. Clique nele para ativar sua
          conta.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Seu nome" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="voce@email.com" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="bg-gradient-brand h-11 w-full font-semibold text-brand-dark hover:opacity-90" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Criar conta grátis
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </Form>
  );
}
