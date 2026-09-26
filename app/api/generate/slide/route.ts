import { NextResponse } from "next/server";
import { estimateCostUsd, regenerateSlide } from "@/lib/anthropic";
import { ApiError, handleRouteError, logError, readJson, zodErrorResponse } from "@/lib/api";
import { getPlan } from "@/lib/plans";
import { parseSlideRow } from "@/lib/schemas/carousel.zod";
import { regenerateSlideRequestSchema } from "@/lib/schemas/generate.zod";
import { enforceRateLimit, requireSession } from "@/lib/server/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Regenerações de slide por dia (não consomem a quota mensal de carrosséis). */
const DAILY_REGENERATIONS = { free: 30, pro: 300, business: 1000 } as const;

/**
 * Reescreve um slide com o Claude e devolve o novo conteúdo.
 * Não grava no banco: o editor aplica o resultado e o auto-save persiste.
 */
export async function POST(request: Request) {
  const context: Record<string, unknown> = { route: "/api/generate/slide" };
  try {
    const { supabase, user, profile } = await requireSession();
    context.userId = user.id;

    const parsed = regenerateSlideRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { carouselId, slideId, instruction } = parsed.data;
    context.carouselId = carouselId;

    const plan = getPlan(profile.plan);
    await enforceRateLimit(user.id, "generate", 10, 60);
    await enforceRateLimit(
      user.id,
      "regenerate-daily",
      DAILY_REGENERATIONS[plan.id],
      86_400,
      "Você atingiu o limite diário de regenerações de slide. Tente novamente amanhã.",
    );

    const { data: carousel } = await supabase
      .from("carousels")
      .select("id, title, tone, project_id, projects(niche)")
      .eq("id", carouselId)
      .maybeSingle();
    if (!carousel) throw new ApiError(404, "carousel_not_found", "Carrossel não encontrado.");

    const { data: rows, error } = await supabase
      .from("slides")
      .select("id, position, layout, content, image_url")
      .eq("carousel_id", carouselId)
      .order("position");
    if (error || !rows) throw new ApiError(500, "db_error", `Falha ao carregar slides: ${error?.message}`);

    const slides = rows.map(parseSlideRow);
    const target = slides.find((s) => s.id === slideId);
    if (!target) throw new ApiError(404, "slide_not_found", "Slide não encontrado. Aguarde o salvamento e tente de novo.");

    const niche = (carousel.projects as { niche: string | null } | null)?.niche ?? "geral";
    const result = await regenerateSlide(
      {
        tone: carousel.tone,
        niche,
        carouselTitle: carousel.title ?? "Carrossel",
        position: target.position,
        total: slides.length,
        role: target.content.role,
        format: target.content.format ?? "text",
        slides: slides.map((s) => ({
          position: s.position,
          title: s.content.hook || s.content.cta || s.content.title,
          body: s.content.body,
        })),
        instruction,
      },
      context,
    );

    const costUsd = estimateCostUsd(result.model, result.usage.inputTokens, result.usage.outputTokens);
    const { error: logInsertError } = await createAdminClient().from("generations_log").insert({
      user_id: user.id,
      carousel_id: carouselId,
      kind: "slide",
      model: result.model,
      tokens_input: result.usage.inputTokens,
      tokens_output: result.usage.outputTokens,
      cost_usd: costUsd,
    });
    if (logInsertError) logError("generation_log_failed", { ...context, err: logInsertError.message });

    // Preserva os ajustes visuais do usuário (cores/fonte) e troca só o texto.
    const content = {
      ...target.content,
      role: result.slide.role,
      hook: result.slide.hook,
      title: result.slide.title,
      body: result.slide.body,
      cta: result.slide.cta,
      kicker: result.slide.kicker ?? target.content.kicker,
      format: target.content.format ?? result.slide.format,
      stat: result.slide.stat,
      visual_hint: result.slide.visual_hint ?? target.content.visual_hint,
    };

    return NextResponse.json({ slideId, content });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
