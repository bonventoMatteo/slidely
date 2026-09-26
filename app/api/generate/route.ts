import { NextResponse } from "next/server";
import { estimateCostUsd, generateCarousel, type Usage } from "@/lib/anthropic";
import { ApiError, handleRouteError, logError, logInfo, readJson, zodErrorResponse } from "@/lib/api";
import { getPlan, planAllows, isPlanId } from "@/lib/plans";
import {
  layoutForSlide,
  parseSlideRow,
  templateLayoutSchema,
  type TemplateLayout,
} from "@/lib/schemas/carousel.zod";
import { generateRequestSchema } from "@/lib/schemas/generate.zod";
import { enforceRateLimit, requireSession } from "@/lib/server/guards";
import { extractUrlFromPrompt, fetchSource, type SourceDocument } from "@/lib/source";
import { firstPhoto } from "@/lib/photos";
import { createAdminClient } from "@/lib/supabase/server";
import { buildTheme } from "@/lib/theme";

export const runtime = "nodejs";

/** Layouts de capa que exibem foto. */
const PHOTO_LAYOUTS = new Set(["bold-hook", "photo-cover", "photo-split", "editorial"]);
export const maxDuration = 60;

export async function POST(request: Request) {
  const context: Record<string, unknown> = { route: "/api/generate" };
  let quotaReserved = false;
  let userId: string | null = null;
  let usage: Usage | null = null;
  let model = "";
  let usageLogged = false;

  try {
    const { supabase, user, profile } = await requireSession();
    userId = user.id;
    context.userId = user.id;

    const parsed = generateRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const input = parsed.data;

    await enforceRateLimit(user.id, "generate", 10, 60);

    const plan = getPlan(profile.plan);

    // Referências opcionais — lidas com o cliente do usuário (RLS garante a posse).
    const [projectRes, brandKitRes, templateRes] = await Promise.all([
      input.projectId
        ? supabase.from("projects").select("id, brand_kit_id").eq("id", input.projectId).maybeSingle()
        : Promise.resolve(null),
      input.brandKitId
        ? supabase.from("brand_kits").select("*").eq("id", input.brandKitId).maybeSingle()
        : Promise.resolve(null),
      input.templateId
        ? supabase.from("templates").select("id, layout_json, required_plan").eq("id", input.templateId).maybeSingle()
        : Promise.resolve(null),
    ]);

    if (input.projectId && !projectRes?.data) throw new ApiError(404, "project_not_found", "Projeto não encontrado.");
    if (input.brandKitId && !brandKitRes?.data) throw new ApiError(404, "brand_kit_not_found", "Brand kit não encontrado.");
    if (input.templateId && !templateRes?.data) throw new ApiError(404, "template_not_found", "Template não encontrado.");

    let template: TemplateLayout | null = null;
    if (templateRes?.data) {
      const required = isPlanId(templateRes.data.required_plan) ? templateRes.data.required_plan : "free";
      if (!planAllows(plan.id, required)) {
        throw new ApiError(403, "plan_required", "Esse template é exclusivo do plano Business.");
      }
      const layout = templateLayoutSchema.safeParse(templateRes.data.layout_json);
      template = layout.success ? layout.data : null;
    }

    // Brand kit: o escolhido na requisição ou o padrão do projeto.
    let brandKit = brandKitRes?.data ?? null;
    if (!brandKit && projectRes?.data?.brand_kit_id) {
      const { data } = await supabase.from("brand_kits").select("*").eq("id", projectRes.data.brand_kit_id).maybeSingle();
      brandKit = data;
    }

    // Quota mensal (reserva atômica; devolvida se algo falhar adiante).
    const admin = createAdminClient();
    const { data: quota, error: quotaError } = await admin.rpc("consume_generation_quota", {
      p_user_id: user.id,
      p_limit: plan.monthlyGenerations,
    });
    if (quotaError) throw new ApiError(500, "quota_error", `Falha ao verificar a quota: ${quotaError.message}`);
    if (!quota?.[0]?.allowed) {
      throw new ApiError(
        402,
        "quota_exceeded",
        `Você usou os ${plan.monthlyGenerations} carrosséis do plano ${plan.name} neste mês. Faça upgrade para continuar.`,
      );
    }
    quotaReserved = true;

    // Link colado: lê a matéria e usa como base factual.
    const sourceUrl = input.sourceUrl ?? extractUrlFromPrompt(input.prompt);
    let source: SourceDocument | null = null;
    let remoteUrl: string | null = null;
    if (sourceUrl) {
      try {
        source = await fetchSource(sourceUrl);
      } catch (err) {
        // Anti-bot (ex.: Cloudflare) ou página montada via JavaScript: o leitor da Anthropic (web_fetch) tenta no lugar.
        if (err instanceof ApiError && (err.code === "source_blocked" || err.code === "source_empty")) {
          remoteUrl = sourceUrl;
          context.sourceFallback = "web_fetch";
        } else {
          throw err;
        }
      }
    }
    const promptIsUrl = Boolean(extractUrlFromPrompt(input.prompt));
    const promptText = promptIsUrl
      ? source
        ? `Transforme a matéria "${source.title}" em um carrossel.`
        : "Transforme a matéria da URL informada em um carrossel."
      : input.prompt;

    const generation = await generateCarousel(
      { prompt: promptText, tone: input.tone, niche: input.niche, slideCount: input.slideCount, source, remoteUrl },
      context,
    );
    usage = generation.usage;
    model = generation.model;
    const costUsd = estimateCostUsd(model, usage.inputTokens, usage.outputTokens);

    // Persistência: projeto (se necessário) → carrossel → slides.
    let projectId = projectRes?.data?.id ?? null;
    let createdProjectId: string | null = null;
    if (!projectId) {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: generation.carousel.title.slice(0, 80),
          niche: input.niche,
          brand_kit_id: brandKit?.id ?? null,
        })
        .select("id")
        .single();
      if (error || !project) throw new ApiError(500, "persist_error", `Falha ao criar projeto: ${error?.message}`);
      projectId = project.id;
      createdProjectId = project.id;
    }

    const theme = buildTheme(template, brandKit);
    const { data: carousel, error: carouselError } = await supabase
      .from("carousels")
      .insert({
        project_id: projectId,
        user_id: user.id,
        title: generation.carousel.title,
        prompt: input.prompt,
        source_url: source?.url ?? remoteUrl,
        tone: input.tone,
        slide_count: input.slideCount,
        template_id: input.templateId ?? null,
        theme,
        status: "ready",
      })
      .select("id")
      .single();
    if (carouselError || !carousel) {
      if (createdProjectId) await supabase.from("projects").delete().eq("id", createdProjectId);
      throw new ApiError(500, "persist_error", `Falha ao salvar carrossel: ${carouselError?.message}`);
    }

    const total = generation.carousel.slides.length;

    // Foto real na capa quando o layout de capa exibe imagem e o banco de fotos está configurado.
    const coverLayout = layoutForSlide(template, 1, total, "text");
    const coverQuery = generation.carousel.slides[0]?.photo_query;
    const coverPhoto = PHOTO_LAYOUTS.has(coverLayout) && coverQuery ? await firstPhoto(coverQuery) : null;
    const { data: slideRows, error: slidesError } = await supabase
      .from("slides")
      .insert(
        generation.carousel.slides.map((slide) => ({
          carousel_id: carousel.id,
          position: slide.position,
          layout: layoutForSlide(template, slide.position, total, slide.format),
          content: {
            role: slide.role,
            format: slide.format,
            kicker: slide.kicker,
            hook: slide.hook,
            title: slide.title,
            body: slide.body,
            stat: slide.stat,
            cta: slide.cta,
            visual_hint: slide.visual_hint,
            photo_query: slide.photo_query,
          },
          image_url: slide.position === 1 && coverPhoto ? coverPhoto.url : null,
        })),
      )
      .select("id, position, layout, content, image_url")
      .order("position");

    if (slidesError || !slideRows) {
      await supabase.from("carousels").delete().eq("id", carousel.id);
      throw new ApiError(500, "persist_error", `Falha ao salvar slides: ${slidesError?.message}`);
    }

    const { error: logInsertError } = await admin.from("generations_log").insert({
      user_id: user.id,
      carousel_id: carousel.id,
      kind: "carousel",
      model,
      tokens_input: usage.inputTokens,
      tokens_output: usage.outputTokens,
      cost_usd: costUsd,
    });
    usageLogged = true;
    if (logInsertError) logError("generation_log_failed", { ...context, err: logInsertError.message });

    logInfo("carousel_generated", {
      ...context,
      carouselId: carousel.id,
      model,
      tokensInput: usage.inputTokens,
      tokensOutput: usage.outputTokens,
      costUsd,
      withSource: Boolean(source),
      viaWebFetch: Boolean(remoteUrl),
    });

    return NextResponse.json({ carouselId: carousel.id, slides: slideRows.map(parseSlideRow) }, { status: 201 });
  } catch (err) {
    if (usage && userId && !usageLogged) {
      // A IA foi cobrada mesmo que a persistência tenha falhado.
      const { error } = await createAdminClient().from("generations_log").insert({
        user_id: userId,
        kind: "carousel",
        model,
        tokens_input: usage.inputTokens,
        tokens_output: usage.outputTokens,
        cost_usd: estimateCostUsd(model, usage.inputTokens, usage.outputTokens),
      });
      if (error) logError("generation_log_failed", { ...context, err: error.message });
    }
    if (quotaReserved && userId) {
      const { error } = await createAdminClient().rpc("refund_generation_quota", { p_user_id: userId });
      if (error) logError("quota_refund_failed", { ...context, err: error.message });
    }
    return handleRouteError(err, context);
  }
}
