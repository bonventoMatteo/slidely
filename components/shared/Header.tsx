"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navFor, type ShellUser } from "./nav";
import { isActive } from "./Sidebar";
import { UsageMeter } from "./UsageMeter";
import { UserMenu } from "./UserMenu";

/** Barra superior mobile com navegação em Sheet. */
export function Header({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // O editor mobile tem barra própria (voltar, salvar, exportar).
  if (pathname.startsWith("/editor")) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
      <Logo href="/dashboard" />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menu">
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col bg-sidebar p-4">
          <SheetHeader className="p-0">
            <SheetTitle asChild>
              <div>
                <Logo href="/dashboard" />
              </div>
            </SheetTitle>
          </SheetHeader>
          <nav aria-label="Aplicativo" className="mt-6 flex flex-1 flex-col gap-1">
            {navFor(user).map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:bg-white/5",
                  )}
                >
                  <item.icon className={cn("size-4", active && "text-primary")} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-3">
            <UsageMeter user={user} />
            <UserMenu user={user} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
