import JSZip from "jszip";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { ApiError, handleRouteError, logError, logInfo, readJson, zodErrorResponse } from "@/lib/api";
import { getPlan } from "@/lib/plans";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/render/layouts";
import { renderCarouselPngs } from "@/lib/render/satori";
import { parseSlideRow, parseTheme, renderRequestSchema } from "@/lib/schemas/carousel.zod";
import { enforceRateLimit, requireSession } from "@/lib/server/guards";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const SIGNED_URL_TTL = 60 * 60;

function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "carrossel"
  );
}

type OutputFile = { name: string; data: Uint8Array; contentType: string };

export async function POST(request: Request) {
  const context: Record<string, unknown> = { route: "/api/render" };
  try {
    const { supabase, user, profile } = await requireSession();
    context.userId = user.id;

    const parsed = renderRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) return zodErrorResponse(parsed.error);
    const { carouselId, format } = parsed.data;
    Object.assign(context, { carouselId, format });

    const plan = getPlan(profile.plan);
    if (format === "pdf" && !plan.pdfExport) {
      throw new ApiError(403, "plan_required", "Export em PDF está disponível nos planos Pro e Business.");
    }

    await enforceRateLimit(user.id, "render", 20, 60);

    const { data: carousel } = await supabase
      .from("carousels")
      .select("id, title, theme")
      .eq("id", carouselId)
      .maybeSingle();
    if (!carousel) throw new ApiError(404, "carousel_not_found", "Carrossel não encontrado.");

    const { data: rows, error } = await supabase
      .from("slides")
      .select("id, position, layout, content, image_url")
      .eq("carousel_id", carouselId)
      .order("position");
    if (error) throw new ApiError(500, "db_error", `Falha ao carregar slides: ${error.message}`);
    if (!rows?.length) throw new ApiError(422, "no_slides", "Esse carrossel não tem slides.");

    const started = Date.now();
    let pngs: Buffer[];
    try {
      pngs = await renderCarouselPngs({
        slides: rows.map(parseSlideRow),
        theme: parseTheme(carousel.theme),
        watermark: plan.watermark,
        origin: new URL(request.url).origin,
      });
    } catch (err) {
      // Fontes indisponíveis ou layout inválido para o Satori.
      logError("render_failed", { ...context, step: "render", err });
      throw new ApiError(500, "render_failed", "Falha ao montar as imagens do carrossel. Tente novamente em instantes.");
    }

    const base = slugify(carousel.title ?? "carrossel");
    const pad = (i: number) => String(i + 1).padStart(2, "0");
    let files: OutputFile[];

    try {
      if (format === "png") {
        files = pngs.map((png, i) => ({ name: `${base}-${pad(i)}.png`, data: png, contentType: "image/png" }));
      } else if (format === "zip") {
        const zip = new JSZip();
        pngs.forEach((png, i) => zip.file(`${base}-${pad(i)}.png`, png));
        const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
        files = [{ name: `${base}.zip`, data, contentType: "application/zip" }];
      } else {
        const pdf = await PDFDocument.create();
        pdf.setTitle(carousel.title ?? "Carrossel");
        pdf.setCreator("slidely");
        for (const png of pngs) {
          const image = await pdf.embedPng(png);
          const page = pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT]);
          page.drawImage(image, { x: 0, y: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT });
        }
        files = [{ name: `${base}.pdf`, data: await pdf.save(), contentType: "application/pdf" }];
      }
    } catch (err) {
      logError("render_failed", { ...context, step: "package", err });
      throw new ApiError(500, "package_failed", "Falha ao empacotar os arquivos. Tente outro formato.");
    }

    // Upload em exports/{userId}/{carouselId}/ e URLs assinadas (1h) que forçam download.
    const admin = createAdminClient();
    const stamp = Date.now();
    const results = await Promise.all(
      files.map(async (file) => {
        const path = `${user.id}/${carouselId}/${stamp}-${file.name}`;
        const { error: uploadError } = await admin.storage
          .from("exports")
          .upload(path, file.data, { contentType: file.contentType, upsert: true });
        if (uploadError) {
          logError("render_failed", { ...context, step: "upload", err: uploadError.message });
          throw new ApiError(500, "storage_error", `Falha ao salvar o arquivo: ${uploadError.message}`);
        }

        const { data: signed, error: signError } = await admin.storage
          .from("exports")
          .createSignedUrl(path, SIGNED_URL_TTL, { download: file.name });
        if (signError || !signed) {
          logError("render_failed", { ...context, step: "sign", err: signError?.message });
          throw new ApiError(500, "storage_error", `Falha ao gerar o link de download: ${signError?.message}`);
        }
        return { name: file.name, url: signed.signedUrl };
      }),
    );

    logInfo("carousel_rendered", { ...context, slides: pngs.length, ms: Date.now() - started, watermark: plan.watermark });

    return NextResponse.json({ files: results, expiresIn: SIGNED_URL_TTL });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
