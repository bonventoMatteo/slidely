import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { errorResponse, logError, logInfo } from "@/lib/api";
import { serverEnv } from "@/lib/env";
import { ACTIVE_SUBSCRIPTION_STATUSES, getStripe, planForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function customerIdOf(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Sincroniza o plano a partir do estado atual da assinatura no Stripe.
 * Sempre relê a assinatura na API: eventos podem chegar fora de ordem.
 */
async function syncSubscription(subscriptionId: string, fallbackUserId: string | null) {
  const stripe = getStripe();
  const admin = createAdminClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = customerIdOf(subscription.customer);
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const paidPlan = planForPriceId(priceId);
  const active = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  const plan = active && paidPlan ? paidPlan : "free";
  const userId = subscription.metadata.user_id || fallbackUserId;

  const update = {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.status === "canceled" ? null : subscription.id,
    subscription_status: subscription.status,
  } as const;

  const query = admin.from("profiles").update(update);
  const { data, error } = userId
    ? await query.eq("id", userId).select("id")
    : await query.eq("stripe_customer_id", customerId ?? "").select("id");

  if (error) throw new Error(`profile_update_failed: ${error.message}`);
  if (!data?.length) throw new Error(`profile_not_found for customer ${customerId}`);

  logInfo("subscription_synced", { userId: data[0].id, plan, status: subscription.status, priceId });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return errorResponse(400, "missing_signature", "Cabeçalho stripe-signature ausente.");

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, serverEnv("STRIPE_WEBHOOK_SECRET"));
  } catch (err) {
    logError("stripe_signature_invalid", { err });
    return errorResponse(400, "invalid_signature", "Assinatura do webhook inválida.");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await syncSubscription(subscriptionId, session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object.id, null);
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    // 500 faz o Stripe reenviar o evento.
    logError("stripe_webhook_failed", { eventId: event.id, type: event.type, err });
    return errorResponse(500, "webhook_failed", "Falha ao processar evento.");
  }
}
