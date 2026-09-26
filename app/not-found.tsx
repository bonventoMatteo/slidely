import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="text-gradient-brand mt-10 font-heading text-7xl font-black">404</p>
      <h1 className="mt-4 text-xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">O link pode estar errado ou o conteúdo foi excluído.</p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Ir para o dashboard</Link>
      </Button>
    </main>
  );
}
