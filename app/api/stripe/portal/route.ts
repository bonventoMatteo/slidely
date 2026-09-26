import { NextResponse } from "next/server";
import { ApiError, handleRouteError } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { requireSession } from "@/lib/server/guards";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/** Abre o Customer Portal do Stripe (trocar plano, cartão, cancelar). */
export async function POST() {
  const context: Record<string, unknown> = { route: "/api/stripe/portal" };
  try {
    const { user, profile } = await requireSession();
    context.userId = user.id;
    if (!profile.stripe_customer_id) {
      throw new ApiError(400, "no_customer", "Você ainda não tem uma assinatura.");
    }
    const portal = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl()}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
