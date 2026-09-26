"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/shared/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { navFor, type ShellUser } from "./nav";
import { UsageMeter } from "./UsageMeter";
import { UserMenu } from "./UserMenu";

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar desktop. No editor vira um trilho compacto de ícones. */
export function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const compact = pathname.startsWith("/editor");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-white/5 bg-sidebar lg:flex",
        compact ? "w-16 items-center py-4" : "w-64 p-4",
      )}
    >
      <div className={cn("flex h-10 items-center", !compact && "px-2")}>
        {compact ? (
          <Link href="/dashboard" aria-label="slidely — voltar ao dashboard" className="rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
            <LogoMark />
          </Link>
        ) : (
          <Logo href="/dashboard" />
        )}
      </div>

      <nav aria-label="Aplicativo" className="mt-8 flex flex-1 flex-col gap-1">
        {navFor(user).map((item) => {
          const active = isActive(pathname, item.href);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                compact ? "size-10 justify-center" : "px-3 py-2",
                active ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <item.icon className={cn("size-4", active && "text-primary")} aria-hidden />
              {compact ? <span className="sr-only">{item.label}</span> : item.label}
            </Link>
          );
          return compact ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <div className={cn("flex flex-col gap-3", compact ? "items-center" : "")}>
        {!compact ? <UsageMeter user={user} /> : null}
        <UserMenu user={user} compact={compact} />
      </div>
    </aside>
  );
}
