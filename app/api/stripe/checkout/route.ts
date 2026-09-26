import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleRouteError, readJson, zodErrorResponse } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { requireSession } from "@/lib/server/guards";
import { ACTIVE_SUBSCRIPTION_STATUSES, getStripe, priceIdForPlan } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

const checkoutSchema = z.object({ plan: z.enum(["pro", "business"]) });

/** Garante um Customer no Stripe vinculado ao usuário. */
async function ensureCustomer(userId: string, email: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const stripe = getStripe();
  const customer = await stripe.customers.create(
    { email, metadata: { user_id: userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  const { error } = await createAdminClient()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  if (error) throw new ApiError(500, "db_error", `Falha ao salvar customer: ${error.message}`);
  return customer.id;
}

export async function POST(request: Request) {
  const context: Record<string, unknown> = { route: "/api/stripe/checkout" };
  try {
    const { user, profile } = await requireSession();
    context.userId = user.id;

    const parsed = checkoutSchema.safeParse(await readJson(request));
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const stripe = getStripe();
    const customerId = await ensureCustomer(user.id, profile.email, profile.stripe_customer_id);

    // Quem já assina troca de plano pelo portal (proration gerenciado pelo Stripe).
    const hasActive =
      profile.stripe_subscription_id &&
      profile.subscription_status &&
      ACTIVE_SUBSCRIPTION_STATUSES.has(profile.subscription_status as Stripe.Subscription.Status);
    if (hasActive) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl()}/billing`,
      });
      return NextResponse.json({ url: portal.url });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdForPlan(parsed.data.plan), quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id, plan: parsed.data.plan },
      allow_promotion_codes: true,
      locale: "pt-BR",
      success_url: `${appUrl()}/billing?success=true`,
      cancel_url: `${appUrl()}/billing?canceled=true`,
    });

    if (!session.url) throw new ApiError(502, "stripe_error", "O Stripe não retornou a URL do checkout.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return handleRouteError(err, context);
  }
}
