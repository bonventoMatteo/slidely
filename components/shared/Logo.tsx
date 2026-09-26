import Image from "next/image";
import Link from "next/link";
import wordmarkWhite from "@/public/brand/slidely-wordmark-white.png";
import { cn } from "@/lib/utils";

/**
 * Símbolo do slidely (dois cards inclinados com gradiente laranja→rosa), em SVG.
 * `bg` precisa ser a cor do fundo: o card da frente "recorta" o de trás.
 */
export function LogoMark({ className, size = 28, bg = "#0a0a0a" }: { className?: string; size?: number; bg?: string }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={Math.round(size * (46 / 39))}
      viewBox="12.5 9.5 39 46"
      fill="none"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="slidely-mark-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="11" x2="0" y2="54">
          <stop offset="0" stopColor="#ff7a1a" />
          <stop offset="0.5" stopColor="#ff5b5d" />
          <stop offset="1" stopColor="#ff4d9d" />
        </linearGradient>
      </defs>
      <rect x="15.5" y="13" width="17" height="35" rx="3" transform="rotate(-12 24 30.5)" stroke="url(#slidely-mark-gradient)" strokeWidth="1.8" />
      <rect x="31" y="15.5" width="17" height="35" rx="3" transform="rotate(11 39.5 33)" stroke={bg} strokeWidth="5" fill={bg} />
      <rect x="31" y="15.5" width="17" height="35" rx="3" transform="rotate(11 39.5 33)" stroke="url(#slidely-mark-gradient)" strokeWidth="1.8" fill={bg} />
    </svg>
  );
}

/** Wordmark "slidely" (versão branca, para o tema escuro). */
export function Logo({ href = "/", className, height = 26 }: { href?: string; className?: string; height?: number }) {
  const width = Math.round((height * wordmarkWhite.width) / wordmarkWhite.height);
  return (
    <Link
      href={href}
      aria-label="slidely — início"
      className={cn(
        "inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className,
      )}
    >
      <Image src={wordmarkWhite} alt="slidely" width={width} height={height} priority className="select-none" />
    </Link>
  );
}
