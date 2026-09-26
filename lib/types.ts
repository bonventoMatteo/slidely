import type { PlanId } from "@/lib/plans";
import type { BrandColors, BrandFonts } from "@/lib/schemas/brandkit.zod";
import type { TemplateLayout } from "@/lib/schemas/carousel.zod";

export type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  requiredPlan: PlanId;
  locked: boolean;
  layout: TemplateLayout;
};

export type BrandKitOption = {
  id: string;
  name: string;
  colors: BrandColors;
  fonts: BrandFonts;
  handle: string;
  logoUrl: string | null;
};

export type ProjectOption = {
  id: string;
  title: string;
  niche: string | null;
  brandKitId: string | null;
};

export type CreationOptions = {
  templates: TemplateOption[];
  brandKits: BrandKitOption[];
  projects: ProjectOption[];
};
