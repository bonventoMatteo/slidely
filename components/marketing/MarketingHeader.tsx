import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#templates", label: "Templates" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "Dúvidas" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Logo height={24} />
        <nav aria-label="Principal" className="hidden items-center gap-8 text-sm text-neutral-400 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition-colors hover:text-white focus-visible:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm text-neutral-300 transition-colors hover:text-white sm:inline-flex">
            Entrar
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-lg bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
