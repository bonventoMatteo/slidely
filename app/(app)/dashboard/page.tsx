import { FolderKanban, Images, Palette, Plus, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CarouselCard } from "@/components/carousel/CarouselCard";
import { NewCarouselDialog } from "@/components/carousel/NewCarouselDialog";
import { EmptyState, PageContainer, PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getPlan } from "@/lib/plans";
import { listCarouselSummaries } from "@/lib/server/carousels";
import { getCreationOptions } from "@/lib/server/queries";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const topic = tema?.trim().slice(0, 300) || undefined;
  const session = await getSession();
  if (!session) redirect("/login?error=session");
  const { supabase, profile } = session;
  const plan = getPlan(profile.plan);

  const [options, recent, carouselCount] = await Promise.all([
    getCreationOptions(supabase, plan.id),
    listCarouselSummaries(supabase, { limit: 8 }),
    supabase.from("carousels").select("id", { count: "exact", head: true }),
  ]);

  const resetDue = new Date(profile.monthly_reset_at).getTime() < Date.now() - 30 * 86_400_000;
  const used = resetDue ? 0 : profile.monthly_generations;
  const unlimited = plan.monthlyGenerations < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / plan.monthlyGenerations) * 100));
  const firstName = (profile.full_name ?? "").split(" ")[0];

  const newButton = (prompt?: string) => (
    <NewCarouselDialog {...options} defaultPrompt={prompt}>
      <Button size="lg" className="bg-gradient-brand h-11 px-5 font-semibold text-brand-dark hover:opacity-90">
        <Plus aria-hidden /> Novo carrossel
      </Button>
    </NewCarouselDialog>
  );

  return (
    <PageContainer>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Seu dashboard"}
        description="Crie, edite e baixe seus carrosséis."
        actions={newButton(topic)}
      />

      <section aria-label="Resumo" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden /> Gerações no mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-black tabular-nums">
              {used}
              <span className="text-lg text-muted-foreground">/{unlimited ? "∞" : plan.monthlyGenerations}</span>
            </p>
            {!unlimited ? <Progress value={pct} className="mt-3 h-1.5" aria-label="Uso da quota mensal" /> : null}
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Images className="size-4 text-primary" aria-hidden /> Carrosséis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-black tabular-nums">{carouselCount.count ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FolderKanban className="size-4 text-primary" aria-hidden /> Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-black tabular-nums">{options.projects.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Palette className="size-4 text-primary" aria-hidden /> Brand kits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-black tabular-nums">
              {options.brandKits.length}
              <span className="text-lg text-muted-foreground">/{plan.brandKits}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="recentes" className="mt-14">
        <div className="flex items-center justify-between">
          <h2 id="recentes" className="text-xl font-bold">
            Recentes
          </h2>
          {recent.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">Ver projetos</Link>
            </Button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Sparkles />}
              title="Seu primeiro carrossel está a um tema de distância"
              description="Escreva um assunto ou cole o link de uma matéria. Em segundos você tem roteiro e artes prontos para editar."
              action={newButton()}
            />
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((carousel) => (
              <CarouselCard key={carousel.id} carousel={carousel} />
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
