export const PLAN_IDS = ["free", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type PlanConfig = {
  id: PlanId;
  name: string;
  priceBRL: number;
  /** -1 = ilimitado */
  monthlyGenerations: number;
  brandKits: number;
  pdfExport: boolean;
  watermark: boolean;
  exclusiveTemplates: boolean;
  prioritySupport: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceBRL: 0,
    monthlyGenerations: 5,
    brandKits: 1,
    pdfExport: false,
    watermark: true,
    exclusiveTemplates: false,
    prioritySupport: false,
    features: ["5 carrosséis por mês", "1 brand kit", "Export PNG e ZIP", "Marca d'água slidely"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceBRL: 49,
    monthlyGenerations: 100,
    brandKits: 5,
    pdfExport: true,
    watermark: false,
    exclusiveTemplates: false,
    prioritySupport: false,
    features: ["100 carrosséis por mês", "5 brand kits", "Export PNG, ZIP e PDF", "Sem marca d'água"],
  },
  business: {
    id: "business",
    name: "Business",
    priceBRL: 149,
    monthlyGenerations: -1,
    brandKits: 20,
    pdfExport: true,
    watermark: false,
    exclusiveTemplates: true,
    prioritySupport: true,
    features: [
      "Carrosséis ilimitados",
      "20 brand kits",
      "Templates exclusivos",
      "Suporte prioritário",
    ],
  },
};

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, business: 2 };

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function getPlan(value: unknown): PlanConfig {
  return PLANS[isPlanId(value) ? value : "free"];
}

export function planAllows(userPlan: PlanId, requiredPlan: PlanId): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}
