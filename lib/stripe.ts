import "server-only";

import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import type { PlanId } from "@/lib/plans";

let stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(serverEnv("STRIPE_SECRET_KEY"), {
      appInfo: { name: "slidely" },
      maxNetworkRetries: 2,
    });
  }
  return stripe;
}

export type PaidPlan = Exclude<PlanId, "free">;

export function priceIdForPlan(plan: PaidPlan): string {
  return plan === "pro" ? serverEnv("STRIPE_PRICE_PRO") : serverEnv("STRIPE_PRICE_BUSINESS");
}

export function planForPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === serverEnv("STRIPE_PRICE_PRO")) return "pro";
  if (priceId === serverEnv("STRIPE_PRICE_BUSINESS")) return "business";
  return null;
}

/** Status de assinatura que dão acesso ao plano pago. */
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing", "past_due"]);
