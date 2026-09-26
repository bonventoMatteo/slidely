import { CreditCard, FolderKanban, LayoutDashboard, LayoutTemplate, Palette, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const APP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/brand-kits", label: "Brand kits", icon: Palette },
  { href: "/billing", label: "Plano", icon: CreditCard },
];

export type ShellUser = {
  email: string;
  fullName: string;
  plan: "free" | "pro" | "business";
  planName: string;
  used: number;
  /** -1 = ilimitado */
  limit: number;
};
