import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { handleRouteError, zodErrorResponse } from "@/lib/api";
import { photosEnabled, searchPhotos } from "@/lib/photos";
import { enforceRateLimit, requireSession } from "@/lib/server/guards";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(2, "Digite pelo menos 2 letras").max(100),
  page: z.coerce.number().int().min(1).max(20).default(1),
});

/** Busca de fotos para o editor. GET /api/photos?q=...&page=1 */
export async function GET(request: NextRequest) {
  const context: Record<string, unknown> = { route: "/api/photos" };
  try {
    const { user } = await requireSession();
    context.userId = user.id;
    if (!photosEnabled()) return NextResponse.json({ enabled: false, photos: [] });

    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return zodErrorResponse(parsed.error);

    await enforceRateLimit(user.id, "photos", 40, 60);
    const photos = await searchPhotos(parsed.data.q, { page: parsed.data.page });
    return NextResponse.json({ enabled: true, photos });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
