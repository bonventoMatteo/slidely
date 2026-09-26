import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/AuthForm";
import { isPlanId } from "@/lib/plans";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string; tema?: string }> }) {
  const { plan, tema } = await searchParams;
  const topic = tema?.trim().slice(0, 300);
  const next =
    isPlanId(plan) && plan !== "free"
      ? `/billing?plan=${plan}`
      : topic
        ? `/dashboard?tema=${encodeURIComponent(topic)}`
        : "/dashboard";
  return (
    <>
      <h1 className="font-heading text-3xl font-black tracking-tight">Crie sua conta grátis</h1>
      <p className="mt-2 text-muted-foreground">
        {topic ? (
          <>
            Crie sua conta e o carrossel sobre <span className="font-medium text-foreground">“{topic}”</span> começa a ser gerado.
          </>
        ) : (
          "5 carrosséis por mês, sem cartão de crédito."
        )}
      </p>
      <div className="mt-8">
        <SignupForm next={next} />
      </div>
    </>
  );
}
