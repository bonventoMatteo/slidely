/* eslint-disable @next/next/no-img-element -- Satori só entende <img> puro */
/**
 * Sistema de design dos slides (1080×1350), usado em três lugares:
 *   - export server-side (Satori via next/og → PNG)
 *   - canvas do editor e prévias de templates (navegador)
 *
 * Regras de compatibilidade com Satori: só estilos inline; todo <div> com mais
 * de um filho declara display:flex; sem grid/calc/classes. Texto rico é feito
 * palavra a palavra com flex-wrap (Satori não quebra linha em spans aninhados).
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";
import type { FontFamily } from "@/lib/schemas/brandkit.zod";
import {
  resolveLayout,
  type Highlight,
  type LayoutId,
  type SlideContent,
  type SlideLayout,
  type Theme,
} from "@/lib/schemas/carousel.zod";
import { contrastRatio, ensureContrast, mix, readableOn, withAlpha } from "./colors";
import { serverFontResolver, type FontResolver } from "./font-families";

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;
const PAD = 88;
const INNER = SLIDE_WIDTH - PAD * 2;

export type SlideRenderInput = {
  layout: SlideLayout;
  content: SlideContent;
  image_url: string | null;
};

export type RenderOptions = {
  theme: Theme;
  position: number;
  total: number;
  watermark?: boolean;
  resolveFont?: FontResolver;
  /** URLs (browser) ou data URIs (servidor) das texturas. */
  textures?: { grain?: string };
};

export const LAYOUT_META: Record<LayoutId, { label: string; description: string; group: "Essenciais" | "Pro" }> = {
  "bold-hook": { label: "Gancho forte", description: "Capa com título gigante na cor primária", group: "Essenciais" },
  split: { label: "Dividido", description: "Título à esquerda, texto à direita", group: "Essenciais" },
  numbered: { label: "Numerado", description: "Número grande, título e texto", group: "Essenciais" },
  quote: { label: "Citação", description: "Aspas grandes e frase central", group: "Essenciais" },
  "cta-strong": { label: "CTA forte", description: "Chamada final com seta e @", group: "Essenciais" },
  minimal: { label: "Minimal", description: "Alinhado à esquerda, muito respiro", group: "Essenciais" },
  editorial: { label: "Editorial", description: "Imagem no topo, texto abaixo", group: "Essenciais" },
  tweet: { label: "Post", description: "Estilo post de X/Threads com avatar", group: "Pro" },
  magazine: { label: "Revista", description: "Manchete serifada, fios e rótulo", group: "Pro" },
  checklist: { label: "Checklist", description: "Lista com ícones de check", group: "Pro" },
  "big-stat": { label: "Número", description: "Dado gigante com legenda", group: "Pro" },
  glass: { label: "Vidro", description: "Cartão translúcido sobre gradiente", group: "Pro" },
  brutal: { label: "Neo brutal", description: "Bordas grossas e sombra dura", group: "Pro" },
  "photo-cover": { label: "Foto cheia", description: "Foto em tela cheia com manchete", group: "Pro" },
  "photo-split": { label: "Foto + texto", description: "Foto no topo, texto no painel", group: "Pro" },
};

type Ctx = {
  theme: Theme;
  position: number;
  total: number;
  heading: string;
  body: string;
  serif: string;
  content: SlideContent;
  image: string | null;
  grain?: string;
  /** Tamanho de fonte com a escala do slide aplicada. */
  fit: (text: string, max: number, min: number, budget: number) => number;
  /** Alinhamento escolhido pelo usuário (ou o padrão do layout). */
  align: (fallback: "left" | "center") => "left" | "center";
  /** Posição vertical escolhida pelo usuário (ou o padrão do layout). */
  justify: (fallback: "flex-start" | "center" | "flex-end") => "flex-start" | "center" | "flex-end";
};

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Remove a marcação **destaque** (para medir tamanho e para contextos sem rich text). */
export function plain(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** Reduz a fonte conforme o texto cresce (determinístico, igual no browser e no Satori). */
function fit(text: string, max: number, min: number, budget: number): number {
  const len = Math.max(plain(text).length, 1);
  if (len <= budget) return max;
  return Math.max(min, Math.round(max * Math.sqrt(budget / len)));
}

function texts(c: SlideContent): { main: string; sub: string } {
  if (c.role === "hook") {
    const main = c.hook || c.title;
    const sub = c.hook && c.title && plain(c.title) !== plain(c.hook) ? c.title : c.body;
    return { main, sub };
  }
  if (c.role === "cta") {
    const main = c.cta || c.title;
    const sub = c.cta ? c.body || (plain(c.title) !== plain(c.cta) ? c.title : "") : c.body;
    return { main, sub };
  }
  return { main: c.title, sub: c.body };
}

const BULLET_RE = /^([-•*–]|\d+[.)])\s+/;

/** Itens de lista do corpo: linhas com marcador; senão, frases. */
function listItems(body: string, max = 6): string[] {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => BULLET_RE.test(l)).map((l) => l.replace(BULLET_RE, ""));
  if (bullets.length >= 2) return bullets.slice(0, max);
  return body
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.trim().replace(/[.;]$/, ""))
    .filter((s) => s.length > 2)
    .slice(0, max);
}

const STAT_RE =
  /(R\$\s?\d[\d.,]*\s?(?:mil|mi|bi|milhões|milhão|bilhões|bilhão)?|US\$\s?\d[\d.,]*\s?(?:mil|mi|bi)?|\d[\d.,]*\s?%|\d[\d.,]*x\b|\d[\d.,]*\s?(?:mil|mi|bi|milhões|bilhões)\b|\b\d{2,}[\d.,]*\b)/i;

/** Número em destaque: campo `stat` ou o primeiro número relevante do texto. */
function statOf(c: SlideContent): string | null {
  if (c.stat?.trim()) return c.stat.trim();
  const match = `${plain(c.title)} ${plain(c.body)}`.match(STAT_RE);
  return match ? match[1].trim() : null;
}

type RichProps = {
  text: string;
  size: number;
  color: string;
  accent: string;
  mode: Highlight;
  family: string;
  weight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center";
  /** Cor do texto sobre o marca-texto. */
  markerText?: string;
};

/**
 * Texto com **destaques**, palavra a palavra em flex-wrap.
 * Trechos destacados curtos viram um bloco único (marca-texto contínuo).
 */
function Rich({
  text,
  size,
  color,
  accent,
  mode,
  family,
  weight = 400,
  lineHeight = 1.15,
  letterSpacing = 0,
  align = "left",
  markerText,
}: RichProps) {
  // Tokens palavra a palavra; `glue` = sem espaço antes (pontuação colada num destaque, parênteses…).
  const items: { text: string; hi: boolean; glue: boolean }[] = [];
  let prevEndsWithSpace = true;
  text.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (!part) return;
    const hi = part.startsWith("**") && part.endsWith("**") && part.length > 4;
    const clean = hi ? part.slice(2, -2) : part;
    const glued = items.length > 0 && !prevEndsWithSpace && !/^\s/.test(clean);
    prevEndsWithSpace = /\s$/.test(clean);
    if (hi && clean.trim().length <= 26) {
      items.push({ text: clean.trim(), hi: true, glue: glued });
      return;
    }
    clean
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w, i) => items.push({ text: w, hi, glue: i === 0 && glued }));
  });

  // Tokens colados (pontuação logo após um destaque) entram no mesmo grupo do anterior.
  const groups: (typeof items)[] = [];
  for (const item of items) {
    if (item.glue && groups.length) groups[groups.length - 1].push(item);
    else groups.push([item]);
  }

  const gap = Math.round(size * 0.27);
  const hiStyle = (): CSSProperties => {
    if (mode === "marker") {
      const padX = Math.round(size * 0.14);
      return {
        backgroundColor: accent,
        // Texto sobre o marca-texto sempre legível, qualquer que seja a combinação do tema.
        color: markerText && contrastRatio(markerText, accent) >= 3 ? markerText : readableOn(accent),
        padding: `0 ${padX}px`,
        marginLeft: -Math.round(padX / 2),
        marginRight: -Math.round(padX / 2),
        borderRadius: Math.round(size * 0.12),
      };
    }
    if (mode === "underline") {
      return { borderBottom: `${Math.max(4, Math.round(size * 0.08))}px solid ${accent}` };
    }
    return { color: accent };
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: gap,
        rowGap: Math.round(size * (lineHeight - 1)),
        justifyContent: align === "center" ? "center" : "flex-start",
        fontFamily: family,
        fontSize: size,
        fontWeight: weight,
        lineHeight: 1,
        letterSpacing,
        color,
      }}
    >
      {groups.map((group, gi) => {
        const spans = group.map((item, i) => (
          <span key={i} style={{ display: "flex", ...(item.hi ? hiStyle() : {}) }}>
            {item.text}
          </span>
        ));
        return group.length === 1 ? (
          <span key={gi} style={{ display: "flex", ...(group[0].hi ? hiStyle() : {}) }}>
            {group[0].text}
          </span>
        ) : (
          // Palavra + pontuação colada: um bloco só, que não quebra no meio.
          <span key={gi} style={{ display: "flex" }}>
            {spans}
          </span>
        );
      })}
    </div>
  );
}

/** Parágrafos do corpo (quebras de linha e marcadores viram blocos). */
function Paragraphs({
  text,
  size,
  color,
  accent,
  mode,
  family,
  align = "left",
  lineHeight = 1.4,
  weight = 400,
}: Omit<RichProps, "letterSpacing" | "markerText">) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: Math.round(size * 0.6) }}>
      {lines.map((line, i) =>
        BULLET_RE.test(line) ? (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: Math.round(size * 0.5) }}>
            <div
              style={{
                display: "flex",
                width: Math.round(size * 0.32),
                height: Math.round(size * 0.32),
                borderRadius: 999,
                backgroundColor: accent,
                marginTop: Math.round(size * 0.34),
                flexShrink: 0,
              }}
            />
            <Rich
              text={line.replace(BULLET_RE, "")}
              size={size}
              color={color}
              accent={accent}
              mode={mode === "marker" ? "color" : mode}
              family={family}
              lineHeight={lineHeight}
              weight={weight}
            />
          </div>
        ) : (
          <Rich
            key={i}
            text={line}
            size={size}
            color={color}
            accent={accent}
            mode={mode === "marker" ? "color" : mode}
            family={family}
            lineHeight={lineHeight}
            weight={weight}
            align={align}
          />
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ícones e peças
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(Math.max(n, 0)).padStart(2, "0");

function Arrow({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 12h15M13 5l7 7-7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Verified({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"
        fill={color}
      />
      <path d="M8 12.3l2.6 2.6L16.2 9.3" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ActionIcon({ kind, color, size }: { kind: "reply" | "repost" | "like" | "save"; color: string; size: number }) {
  const d = {
    reply: "M4 5h16v11H9l-5 4z",
    repost: "M7 7h10l-3-3M17 17H7l3 3M17 7v6M7 17v-6",
    like: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
    save: "M6 3h12v18l-6-4-6 4z",
  }[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function displayName(theme: Theme): string {
  if (theme.brandName.trim()) return theme.brandName.trim();
  if (theme.handle) return theme.handle.charAt(0).toUpperCase() + theme.handle.slice(1);
  return "Seu perfil";
}

/** Avatar: logo do brand kit ou monograma no gradiente primária→destaque. */
function Avatar({ theme, size, ring }: { theme: Theme; size: number; ring?: string }) {
  if (theme.logoUrl) {
    return (
      <img
        src={theme.logoUrl}
        width={size}
        height={size}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: size,
          objectFit: "cover",
          ...(ring ? { border: `3px solid ${ring}` } : {}),
          backgroundColor: "#ffffff",
        }}
      />
    );
  }
  const letter = displayName(theme).charAt(0).toUpperCase();
  const a = theme.colors.primary;
  const b = theme.colors.accent;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size,
        backgroundImage: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        color: readableOn(mix(a, b, 0.5)),
        fontSize: Math.round(size * 0.46),
        fontWeight: 900,
        ...(ring ? { border: `3px solid ${ring}` } : {}),
      }}
    >
      {letter}
    </div>
  );
}

/** Rótulo curto: "label" (caixa alta com fio) ou "chip" (pílula). */
function Kicker({
  text,
  color,
  family,
  variant = "label",
  chipBg,
  chipBorder,
  size = 26,
}: {
  text: string;
  color: string;
  family: string;
  variant?: "label" | "chip";
  chipBg?: string;
  chipBorder?: string;
  size?: number;
}) {
  const label = plain(text).toUpperCase();
  if (variant === "chip") {
    return (
      <div style={{ display: "flex" }}>
        <div
          style={{
            display: "flex",
            padding: `${Math.round(size * 0.42)}px ${Math.round(size * 0.9)}px`,
            borderRadius: 999,
            backgroundColor: chipBg ?? "transparent",
            ...(chipBorder ? { border: `3px solid ${chipBorder}` } : {}),
            color,
            fontFamily: family,
            fontSize: size,
            fontWeight: 700,
            letterSpacing: 3,
          }}
        >
          {label}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", width: 44, height: 4, backgroundColor: color }} />
      <div style={{ display: "flex", color, fontFamily: family, fontSize: size, fontWeight: 700, letterSpacing: 5 }}>
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Moldura: fundo, decoração, cabeçalho e rodapé padronizados
// ---------------------------------------------------------------------------

function decoration(theme: Theme, fg: string, accent: string): ReactNode {
  const full: CSSProperties = { position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT };
  switch (theme.decoration) {
    case "dots":
      return (
        <div
          style={{
            ...full,
            display: "flex",
            backgroundImage: `radial-gradient(circle at center, ${withAlpha(fg, 0.13)} 0%, ${withAlpha(fg, 0.13)} 12%, transparent 16%)`,
            backgroundSize: "40px 40px",
          }}
        />
      );
    case "grid":
      return (
        <div
          style={{
            ...full,
            display: "flex",
            backgroundImage: `linear-gradient(${withAlpha(fg, 0.07)} 2px, transparent 2px), linear-gradient(90deg, ${withAlpha(fg, 0.07)} 2px, transparent 2px)`,
            backgroundSize: "72px 72px",
          }}
        />
      );
    case "glow":
      return (
        <div style={{ ...full, display: "flex" }}>
          <div
            style={{
              position: "absolute",
              top: -320,
              right: -320,
              width: 900,
              height: 900,
              display: "flex",
              backgroundImage: `radial-gradient(circle, ${withAlpha(accent, 0.45)} 0%, transparent 65%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -380,
              left: -300,
              width: 900,
              height: 900,
              display: "flex",
              backgroundImage: `radial-gradient(circle, ${withAlpha(accent, 0.25)} 0%, transparent 65%)`,
            }}
          />
        </div>
      );
    case "frame":
      return (
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 36,
            width: SLIDE_WIDTH - 72,
            height: SLIDE_HEIGHT - 72,
            display: "flex",
            border: `3px solid ${withAlpha(fg, 0.22)}`,
            borderRadius: 28,
          }}
        />
      );
    default:
      return null;
  }
}

function Header({ ctx, fg }: { ctx: Ctx; fg: string }) {
  const { theme } = ctx;
  const hasBrand = Boolean(theme.logoUrl || theme.handle);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: 64,
        fontFamily: ctx.body,
        fontSize: 27,
        fontWeight: 700,
        color: withAlpha(fg, 0.62),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {hasBrand ? <Avatar theme={theme} size={52} /> : null}
        {theme.handle ? <span>@{theme.handle}</span> : null}
      </div>
      <span style={{ letterSpacing: 3 }}>
        {pad2(ctx.position)} / {pad2(ctx.total)}
      </span>
    </div>
  );
}

function Footer({ ctx, fg, accent, arrow = true }: { ctx: Ctx; fg: string; accent: string; arrow?: boolean }) {
  const dots = Array.from({ length: Math.min(ctx.total, 15) }, (_, i) => i + 1);
  const isLast = ctx.position >= ctx.total;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", height: 72, marginTop: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {dots.map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              width: i === ctx.position ? 40 : 12,
              height: 12,
              borderRadius: 12,
              backgroundColor: i === ctx.position ? accent : withAlpha(fg, 0.2),
            }}
          />
        ))}
      </div>
      {arrow && !isLast ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 72,
            border: `2px solid ${withAlpha(fg, 0.28)}`,
          }}
        >
          <Arrow color={fg} size={32} />
        </div>
      ) : null}
    </div>
  );
}

function Frame({
  ctx,
  bg,
  fg,
  accent,
  children,
  background,
  header = true,
  footer = true,
  arrow = true,
  decorate = true,
}: {
  ctx: Ctx;
  bg: string;
  fg: string;
  accent: string;
  children: ReactNode;
  background?: ReactNode;
  header?: boolean;
  footer?: boolean;
  arrow?: boolean;
  decorate?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundColor: bg,
        color: fg,
        fontFamily: ctx.body,
        overflow: "hidden",
      }}
    >
      {background}
      {decorate ? decoration(ctx.theme, fg, accent) : null}
      {ctx.theme.texture === "grain" && ctx.grain ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            display: "flex",
            backgroundImage: `url(${ctx.grain})`,
            backgroundSize: "220px 220px",
            backgroundRepeat: "repeat",
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          padding: PAD,
        }}
      >
        {header ? <Header ctx={ctx} fg={fg} /> : null}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, width: "100%" }}>{children}</div>
        {footer ? <Footer ctx={ctx} fg={fg} accent={accent} arrow={arrow} /> : null}
      </div>
    </div>
  );
}

function colorsFor(ctx: Ctx, defaultBg: string, preferText?: string) {
  const bg = ctx.content.bgOverride ?? defaultBg;
  const fg = ctx.content.textColorOverride ?? ensureContrast(preferText ?? ctx.theme.colors.text, bg);
  const accent = contrastRatio(ctx.theme.colors.accent, bg) >= 2.2 ? ctx.theme.colors.accent : fg;
  return { bg, fg, accent };
}

/** Cor de marca-texto legível: o destaque se tiver contraste com o texto, senão uma versão clara dele. */
function markerFor(accent: string, fg: string) {
  return contrastRatio(accent, fg) >= 3 ? accent : mix(accent, "#ffffff", 0.55);
}

// ---------------------------------------------------------------------------
// Layouts essenciais
// ---------------------------------------------------------------------------

function BoldHook(ctx: Ctx): ReactElement {
  const hasImage = Boolean(ctx.image);
  const base = colorsFor(ctx, ctx.theme.colors.primary, ctx.theme.colors.secondary);
  const fg = hasImage ? (ctx.content.textColorOverride ?? "#ffffff") : base.fg;
  const accent = hasImage ? ctx.theme.colors.accent : base.accent;
  const { main, sub } = texts(ctx.content);
  const mode = ctx.theme.highlight;

  const background = hasImage ? (
    <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, display: "flex" }}>
      <img
        src={ctx.image ?? ""}
        width={SLIDE_WIDTH}
        height={SLIDE_HEIGHT}
        alt=""
        style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </div>
  ) : undefined;

  return (
    <Frame ctx={ctx} bg={base.bg} fg={fg} accent={accent} background={background} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify(hasImage ? "flex-end" : "center"), gap: 44 }}>
        {ctx.content.kicker ? (
          <Kicker text={ctx.content.kicker} color={accent} family={ctx.body} variant="chip" chipBorder={accent} />
        ) : (
          <div style={{ display: "flex", width: 132, height: 12, borderRadius: 12, backgroundColor: accent }} />
        )}
        <Rich
          text={main}
          size={ctx.fit(main, 116, 64, 38)}
          color={fg}
          accent={accent}
          mode={mode}
          markerText={fg === "#ffffff" ? "#0a0a0a" : undefined}
          family={ctx.heading}
          weight={900}
          lineHeight={1.06}
          letterSpacing={-2}
          align={ctx.align("left")}
        />
        {sub ? (
          <Rich text={sub} size={ctx.fit(sub, 42, 30, 90)} color={withAlpha(fg, 0.82)} accent={accent} mode="color" family={ctx.body} lineHeight={1.35} />
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 48, fontSize: 30, fontWeight: 700, color: accent, letterSpacing: 1 }}>
        <span style={{ marginRight: 16 }}>Arrasta pro lado</span>
        <Arrow color={accent} size={40} />
      </div>
    </Frame>
  );
}

function Split(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 420, gap: 28 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: accent, letterSpacing: 3 }}>
            {ctx.content.kicker ? plain(ctx.content.kicker).toUpperCase() : pad2(ctx.position - 1)}
          </div>
          <Rich
            text={main}
            size={ctx.fit(main, 62, 40, 24)}
            color={fg}
            accent={accent}
            mode={ctx.theme.highlight}
            markerText={fg}
            family={ctx.heading}
            weight={900}
            lineHeight={1.1}
            letterSpacing={-1}
          />
        </div>
        <div style={{ display: "flex", width: 6, height: 520, borderRadius: 6, backgroundColor: accent, marginLeft: 48, marginRight: 48 }} />
        <div style={{ display: "flex", flex: 1 }}>
          <Paragraphs text={sub} size={ctx.fit(sub, 40, 27, 170)} color={withAlpha(fg, 0.85)} accent={accent} mode={ctx.theme.highlight} family={ctx.body} />
        </div>
      </div>
    </Frame>
  );
}

function Numbered(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center"), gap: 34 }}>
        <div style={{ display: "flex", fontFamily: ctx.heading, fontSize: 280, fontWeight: 900, lineHeight: 0.9, letterSpacing: -12, color: accent }}>
          {pad2(ctx.position - 1)}
        </div>
        {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={withAlpha(fg, 0.7)} family={ctx.body} /> : null}
        <Rich
          text={main}
          size={ctx.fit(main, 80, 50, 30)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.08}
          letterSpacing={-1}
        align={ctx.align("left")} />
        {sub ? (
          <Paragraphs text={sub} size={ctx.fit(sub, 42, 29, 190)} color={withAlpha(fg, 0.82)} accent={accent} mode={ctx.theme.highlight} family={ctx.body} />
        ) : null}
      </div>
    </Frame>
  );
}

function Quote(ctx: Ctx): ReactElement {
  const tinted = mix(ctx.theme.colors.bg, ctx.theme.colors.accent, 0.1);
  const { bg, fg, accent } = colorsFor(ctx, tinted);
  const { main, sub } = texts(ctx.content);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: ctx.justify("center"), alignItems: "center", gap: 40 }}>
        <div style={{ display: "flex", fontFamily: ctx.serif, fontSize: 340, fontWeight: 900, lineHeight: 1, height: 200, color: accent }}>
          “
        </div>
        <Rich
          text={main}
          size={ctx.fit(main, 72, 44, 56)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.15}
          letterSpacing={-1}
          align="center"
        />
        {sub ? <Paragraphs text={sub} size={ctx.fit(sub, 38, 27, 170)} color={withAlpha(fg, 0.78)} accent={accent} mode="color" family={ctx.body} align="center" /> : null}
      </div>
    </Frame>
  );
}

function CtaStrong(ctx: Ctx): ReactElement {
  const bg = ctx.content.bgOverride ?? ctx.theme.colors.accent;
  const fg = ctx.content.textColorOverride ?? readableOn(bg);
  const { main, sub } = texts(ctx.content);
  const { theme } = ctx;
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={fg} footer={false}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: ctx.justify("center"), alignItems: "center", gap: 36 }}>
        {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={fg} family={ctx.body} variant="chip" chipBorder={fg} /> : null}
        <Rich
          text={main}
          size={ctx.fit(main, 104, 60, 34)}
          color={fg}
          accent={mix(fg, bg, 0.35)}
          mode="underline"
          family={ctx.heading}
          weight={900}
          lineHeight={1.06}
          letterSpacing={-2}
          align="center"
        />
        {sub ? <Rich text={sub} size={ctx.fit(sub, 40, 28, 120)} color={withAlpha(fg, 0.85)} accent={fg} mode="color" family={ctx.body} lineHeight={1.4} align="center" /> : null}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 168, height: 168, borderRadius: 168, backgroundColor: fg, marginTop: 28 }}>
          <Arrow color={bg} size={88} />
        </div>
      </div>
      {theme.handle ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 38, fontWeight: 700, padding: "12px 36px 12px 14px", borderRadius: 999, border: `3px solid ${fg}` }}>
            <Avatar theme={theme} size={56} />@{theme.handle}
          </div>
        </div>
      ) : null}
    </Frame>
  );
}

function Minimal(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const isHook = ctx.content.role === "hook";
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center"), gap: 44 }}>
        {ctx.content.kicker ? (
          <Kicker text={ctx.content.kicker} color={accent} family={ctx.body} />
        ) : (
          <div style={{ display: "flex", width: 88, height: 8, backgroundColor: accent }} />
        )}
        <Rich
          text={main}
          size={ctx.fit(main, isHook ? 104 : 84, 52, isHook ? 40 : 32)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={700}
          lineHeight={1.12}
          letterSpacing={-1.5}
        align={ctx.align("left")} />
        {sub ? <Paragraphs text={sub} size={ctx.fit(sub, 40, 28, 210)} color={withAlpha(fg, 0.75)} accent={accent} mode={ctx.theme.highlight} family={ctx.body} lineHeight={1.5} /> : null}
      </div>
    </Frame>
  );
}

function Editorial(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const panelBg = ctx.theme.colors.primary;
  const panelFg = readableOn(panelBg);
  const panelHeight = 500;
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: panelHeight,
          marginTop: 24,
          borderRadius: 32,
          overflow: "hidden",
          backgroundColor: panelBg,
          position: "relative",
        }}
      >
        {ctx.image ? (
          <img src={ctx.image} width={INNER} height={panelHeight} alt="" style={{ width: INNER, height: panelHeight, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              padding: 48,
              color: panelFg,
              backgroundImage: `linear-gradient(135deg, ${panelBg} 0%, ${mix(panelBg, ctx.theme.colors.accent, 0.45)} 100%)`,
            }}
          >
            <div style={{ display: "flex", fontFamily: ctx.heading, fontSize: 200, fontWeight: 900, lineHeight: 0.9, letterSpacing: -8 }}>
              {pad2(ctx.position)}
            </div>
            {ctx.content.visual_hint ? (
              <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: withAlpha(panelFg, 0.75) }}>{ctx.content.visual_hint}</div>
            ) : null}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: ctx.justify("center"), gap: 26 }}>
        {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={accent} family={ctx.body} size={24} /> : null}
        <Rich
          text={main}
          size={ctx.fit(main, 66, 42, 40)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.1}
          letterSpacing={-1}
        />
        {sub ? <Paragraphs text={sub} size={ctx.fit(sub, 34, 25, 170)} color={withAlpha(fg, 0.8)} accent={accent} mode={ctx.theme.highlight} family={ctx.body} /> : null}
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Layouts Pro
// ---------------------------------------------------------------------------

/** Post no estilo X/Threads: avatar, nome, verificado, texto e ações. */
function Tweet(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const muted = withAlpha(fg, 0.55);
  const verified = contrastRatio("#1d9bf0", bg) >= 2 ? "#1d9bf0" : accent;
  const isCta = ctx.content.role === "cta";
  const mainSize = ctx.fit(main, sub ? 72 : 84, 46, sub ? 56 : 64);
  const subSize = ctx.fit(sub, 48, 32, 150);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent} header={false} arrow={!isCta}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center"), gap: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Avatar theme={ctx.theme} size={128} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 46, fontWeight: 700, color: fg }}>
              {displayName(ctx.theme)}
              <Verified color={verified} size={44} />
            </div>
            <div style={{ display: "flex", fontSize: 36, color: muted }}>
              {ctx.theme.handle ? `@${ctx.theme.handle}` : "@seuperfil"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(mainSize * 0.7) }}>
          <Rich text={main} size={mainSize} color={fg} accent={accent} mode={ctx.theme.highlight} markerText={fg} family={ctx.body} weight={700} lineHeight={1.25} align={ctx.align("left")} />
          {sub ? <Paragraphs text={sub} size={subSize} color={withAlpha(fg, 0.9)} accent={accent} mode="color" family={ctx.body} lineHeight={1.4} /> : null}
        </div>
        {ctx.image ? (
          <img
            src={ctx.image}
            width={INNER}
            height={420}
            alt=""
            style={{ width: INNER, height: 420, objectFit: "cover", borderRadius: 32, border: `2px solid ${withAlpha(fg, 0.12)}` }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", fontSize: 28, color: muted }}>
            {pad2(ctx.position)} de {pad2(ctx.total)} · Fio
          </div>
          <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: withAlpha(fg, 0.12) }} />
          <div style={{ display: "flex", justifyContent: "space-between", paddingRight: 120 }}>
            {(["reply", "repost", "like", "save"] as const).map((kind) => (
              <ActionIcon key={kind} kind={kind} color={muted} size={44} />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

/** Editorial de revista: rótulo, fios, manchete serifada e número da página. */
function Magazine(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const isCover = ctx.content.role === "hook";
  const kicker = ctx.content.kicker || (isCover ? "Edição especial" : `Capítulo ${pad2(ctx.position - 1)}`);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent} header={false} decorate={false}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 6, color: accent }}>{plain(kicker).toUpperCase()}</div>
          <div style={{ display: "flex", fontFamily: ctx.serif, fontSize: 30, fontWeight: 700, color: withAlpha(fg, 0.7) }}>
            Nº {pad2(ctx.position)}
          </div>
        </div>
        <div style={{ display: "flex", width: "100%", height: 4, backgroundColor: fg }} />
        <div style={{ display: "flex", width: "100%", height: 1, backgroundColor: withAlpha(fg, 0.5), marginTop: 2 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: ctx.justify(isCover ? "flex-end" : "center"), gap: 40, paddingBottom: isCover ? 24 : 0 }}>
        <Rich
          text={main}
          size={ctx.fit(main, isCover ? 112 : 88, 54, isCover ? 34 : 36)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.04}
          letterSpacing={-2}
        />
        <div style={{ display: "flex", width: 120, height: 6, backgroundColor: accent }} />
        {sub ? (
          <Paragraphs text={sub} size={ctx.fit(sub, isCover ? 40 : 36, 26, 180)} color={withAlpha(fg, 0.82)} accent={accent} mode="color" family={ctx.body} lineHeight={1.5} />
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 18, marginTop: 36 }}>
        <div style={{ display: "flex", width: "100%", height: 2, backgroundColor: withAlpha(fg, 0.6) }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: withAlpha(fg, 0.65), letterSpacing: 2 }}>
          <span>{ctx.theme.handle ? `@${ctx.theme.handle}` : displayName(ctx.theme)}</span>
          <span>
            {pad2(ctx.position)} — {pad2(ctx.total)}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/** Lista com checks: título + itens (marcadores do corpo ou frases). */
function Checklist(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const items = listItems(sub);
  const longest = Math.max(...items.map((i) => plain(i).length), 10);
  const itemSize = items.length >= 5 || longest > 70 ? 34 : longest > 45 ? 38 : 42;
  const checkBg = accent;
  const checkFg = readableOn(checkBg);
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center"), gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={accent} family={ctx.body} /> : null}
          <Rich
            text={main}
            size={ctx.fit(main, 76, 48, 32)}
            color={fg}
            accent={accent}
            mode={ctx.theme.highlight}
            markerText={fg}
            family={ctx.heading}
            weight={900}
            lineHeight={1.08}
            letterSpacing={-1}
          align={ctx.align("left")} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 28,
                paddingTop: 26,
                paddingBottom: 26,
                borderTop: `2px solid ${withAlpha(fg, 0.1)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 56, backgroundColor: checkBg, flexShrink: 0 }}>
                <Check color={checkFg} size={34} />
              </div>
              <div style={{ display: "flex", flex: 1, paddingTop: Math.max(0, Math.round((56 - itemSize * 1.2) / 2)) }}>
                <Rich text={item} size={itemSize} color={fg} accent={accent} mode="color" family={ctx.body} weight={700} lineHeight={1.3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

/** Dado gigante (ex.: 36%) com legenda; porcentagens ganham barra de progresso. */
function BigStat(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const stat = statOf(ctx.content);
  if (!stat) return Numbered(ctx);
  const statSize = stat.length <= 4 ? 300 : stat.length <= 7 ? 220 : stat.length <= 10 ? 170 : 130;
  const pct = stat.match(/^(\d{1,3}(?:[.,]\d+)?)\s?%$/);
  const pctValue = pct ? Math.min(100, Number.parseFloat(pct[1].replace(",", "."))) : null;
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center"), gap: 36 }}>
        {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={withAlpha(fg, 0.7)} family={ctx.body} /> : null}
        <div style={{ display: "flex", fontFamily: ctx.heading, fontSize: statSize, fontWeight: 900, lineHeight: 0.95, letterSpacing: -Math.round(statSize * 0.04), color: accent }}>
          {stat}
        </div>
        {pctValue !== null ? (
          <div style={{ display: "flex", width: "100%", height: 18, borderRadius: 18, backgroundColor: withAlpha(fg, 0.1) }}>
            <div style={{ display: "flex", width: `${pctValue}%`, height: 18, borderRadius: 18, backgroundColor: accent }} />
          </div>
        ) : (
          <div style={{ display: "flex", width: 160, height: 10, borderRadius: 10, backgroundColor: accent }} />
        )}
        <Rich
          text={main}
          size={ctx.fit(main, 64, 42, 40)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.12}
          letterSpacing={-1}
        align={ctx.align("left")} />
        {sub ? <Paragraphs text={sub} size={ctx.fit(sub, 36, 26, 170)} color={withAlpha(fg, 0.75)} accent={accent} mode="color" family={ctx.body} /> : null}
      </div>
    </Frame>
  );
}

/** Cartão translúcido sobre gradiente em malha (primária + destaque). */
function Glass(ctx: Ctx): ReactElement {
  const base = ctx.content.bgOverride ?? mix(ctx.theme.colors.primary, "#000000", 0.35);
  const a = ctx.theme.colors.accent;
  const p = ctx.theme.colors.primary;
  const fg = ctx.content.textColorOverride ?? "#ffffff";
  const { main, sub } = texts(ctx.content);
  const isList = ctx.content.format === "list" || ctx.content.body.split("\n").filter((l) => BULLET_RE.test(l.trim())).length >= 2;
  const isHook = ctx.content.role === "hook";
  const isCta = ctx.content.role === "cta";
  const background = (
    <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, display: "flex" }}>
      <div style={{ position: "absolute", top: -300, left: -260, width: 1000, height: 1000, display: "flex", backgroundImage: `radial-gradient(circle, ${withAlpha(a, 0.85)} 0%, transparent 62%)` }} />
      <div style={{ position: "absolute", bottom: -360, right: -300, width: 1100, height: 1100, display: "flex", backgroundImage: `radial-gradient(circle, ${withAlpha(mix(p, "#ffffff", 0.25), 0.9)} 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 420, right: -380, width: 800, height: 800, display: "flex", backgroundImage: `radial-gradient(circle, ${withAlpha(mix(a, p, 0.5), 0.6)} 0%, transparent 60%)` }} />
    </div>
  );
  return (
    <Frame ctx={ctx} bg={base} fg={fg} accent={fg} background={background} decorate={false} footer={!isHook} arrow={!isCta}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center") }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 36,
            padding: 68,
            borderRadius: 48,
            backgroundColor: "rgba(255,255,255,0.12)",
            border: "2px solid rgba(255,255,255,0.32)",
            boxShadow: "0 40px 90px rgba(0,0,0,0.35)",
          }}
        >
          {ctx.content.kicker ? (
            <Kicker text={ctx.content.kicker} color={fg} family={ctx.body} variant="chip" chipBg="rgba(255,255,255,0.16)" size={24} />
          ) : null}
          <Rich
            text={main}
            size={ctx.fit(main, isHook ? 112 : 84, 50, isHook ? 34 : 30)}
            color={fg}
            accent={mix(a, "#ffffff", 0.35)}
            mode={ctx.theme.highlight === "marker" ? "marker" : ctx.theme.highlight}
            markerText="#0a0a0a"
            family={ctx.heading}
            weight={900}
            lineHeight={1.08}
            letterSpacing={-1.5}
          align={ctx.align("left")} />
          {sub ? (
            isList ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                {listItems(sub, 5).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.9)", flexShrink: 0 }}>
                      <Check color={mix(p, "#000000", 0.2)} size={28} />
                    </div>
                    <div style={{ display: "flex", flex: 1, paddingTop: 4 }}>
                      <Rich text={item} size={ctx.fit(item, 42, 32, 30)} color={fg} accent={fg} mode="color" family={ctx.body} weight={700} lineHeight={1.3} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Paragraphs text={sub} size={ctx.fit(sub, 42, 28, 160)} color="rgba(255,255,255,0.86)" accent={fg} mode="color" family={ctx.body} />
            )
          ) : null}
          {isCta && ctx.theme.handle ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
              <Avatar theme={ctx.theme} size={56} ring="rgba(255,255,255,0.6)" />@{ctx.theme.handle}
            </div>
          ) : null}
        </div>
      </div>
      {isHook ? (
        <div style={{ display: "flex", alignItems: "center", marginTop: 48, fontSize: 30, fontWeight: 700, color: fg }}>
          <span style={{ marginRight: 16 }}>Arrasta pro lado</span>
          <Arrow color={fg} size={40} />
        </div>
      ) : null}
    </Frame>
  );
}

/** Neo-brutalista: cartão branco com borda grossa e sombra dura. */
function Brutal(ctx: Ctx): ReactElement {
  const bg = ctx.content.bgOverride ?? ctx.theme.colors.bg;
  const ink = ctx.content.textColorOverride ?? ensureContrast(ctx.theme.colors.text, "#ffffff", 7);
  const accent = ctx.theme.colors.accent;
  const { main, sub } = texts(ctx.content);
  const isHook = ctx.content.role === "hook";
  const isCta = ctx.content.role === "cta";
  const isList = ctx.content.format === "list" || sub.split("\n").filter((l) => BULLET_RE.test(l.trim())).length >= 2;
  const headerFg = ensureContrast(ink, bg);
  return (
    <Frame ctx={ctx} bg={bg} fg={headerFg} accent={headerFg} decorate={ctx.theme.decoration !== "none"} arrow={!isCta}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: ctx.align("left") === "center" ? "center" : "stretch", justifyContent: ctx.justify("center") }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 36,
            padding: 64,
            marginRight: 20,
            borderRadius: 28,
            backgroundColor: "#ffffff",
            border: `6px solid ${ink}`,
            boxShadow: `20px 20px 0 ${ink}`,
            color: ink,
          }}
        >
          {ctx.content.kicker || isHook ? (
            <div style={{ display: "flex" }}>
              <div
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 14,
                  backgroundColor: accent,
                  color: readableOn(accent),
                  border: `4px solid ${ink}`,
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: 2,
                }}
              >
                {plain(ctx.content.kicker || "Leia até o fim").toUpperCase()}
              </div>
            </div>
          ) : null}
          <Rich
            text={main}
            size={ctx.fit(main, isHook ? 112 : 84, 50, isHook ? 34 : 30)}
            color={ink}
            accent={markerFor(accent, ink)}
            mode={ctx.theme.highlight}
            markerText={ink}
            family={ctx.heading}
            weight={900}
            lineHeight={1.06}
            letterSpacing={-1.5}
          align={ctx.align("left")} />
          {sub ? (
            isList ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {listItems(sub, 5).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, borderRadius: 10, border: `4px solid ${ink}`, backgroundColor: accent, flexShrink: 0 }}>
                      <Check color={readableOn(accent)} size={30} />
                    </div>
                    <div style={{ display: "flex", flex: 1, paddingTop: 4 }}>
                      <Rich text={item} size={ctx.fit(item, 42, 32, 30)} color={ink} accent={ink} mode="color" family={ctx.body} weight={700} lineHeight={1.3} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Paragraphs text={sub} size={ctx.fit(sub, 42, 28, 160)} color={withAlpha(ink, 0.85)} accent={ink} mode="color" family={ctx.body} />
            )
          ) : null}
          {isCta && ctx.theme.handle ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 800 }}>
              <Avatar theme={ctx.theme} size={56} ring={ink} />@{ctx.theme.handle}
            </div>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}

/** Escurecimento da foto: intensidade escolhida pelo usuário (padrão 0,7). */
function scrim(strength: number) {
  const s = Math.max(0, Math.min(1, strength));
  const a0 = (0.04 + 0.18 * s).toFixed(2);
  const a1 = (0.12 + 0.4 * s).toFixed(2);
  const a2 = Math.min(0.96, 0.32 + 0.62 * s).toFixed(2);
  return `linear-gradient(180deg, rgba(0,0,0,${a0}) 0%, rgba(0,0,0,${a0}) 30%, rgba(0,0,0,${a1}) 58%, rgba(0,0,0,${a2}) 100%)`;
}

/** Foto em tela cheia com manchete sobre gradiente de legibilidade. */
function PhotoCover(ctx: Ctx): ReactElement {
  if (!ctx.image) return BoldHook(ctx);
  const fg = ctx.content.textColorOverride ?? "#ffffff";
  const accent = ctx.theme.colors.accent;
  const { main, sub } = texts(ctx.content);
  const isHook = ctx.content.role === "hook";
  const isCta = ctx.content.role === "cta";
  const align = ctx.align("left");
  const background = (
    <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, display: "flex" }}>
      <img src={ctx.image} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} alt="" style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, display: "flex", backgroundImage: scrim(ctx.content.overlay ?? 0.7) }} />
    </div>
  );
  return (
    <Frame ctx={ctx} bg="#000000" fg={fg} accent={accent} background={background} decorate={false} footer={!isHook} arrow={!isCta}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: ctx.justify("flex-end"),
          alignItems: align === "center" ? "center" : "flex-start",
          gap: 34,
        }}
      >
        {ctx.content.kicker ? (
          <Kicker text={ctx.content.kicker} color={readableOn(accent)} family={ctx.body} variant="chip" chipBg={accent} size={24} />
        ) : null}
        <Rich
          text={main}
          size={ctx.fit(main, isHook ? 110 : 84, 56, isHook ? 36 : 34)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText="#0a0a0a"
          family={ctx.heading}
          weight={900}
          lineHeight={1.04}
          letterSpacing={-2}
          align={align}
        />
        {sub ? (
          <Paragraphs text={sub} size={ctx.fit(sub, 38, 27, 150)} color="rgba(255,255,255,0.86)" accent={accent} mode="color" family={ctx.body} align={align} />
        ) : null}
        {isCta && ctx.theme.handle ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
            <Avatar theme={ctx.theme} size={56} ring="rgba(255,255,255,0.7)" />@{ctx.theme.handle}
          </div>
        ) : null}
      </div>
      {isHook ? (
        <div style={{ display: "flex", alignItems: "center", marginTop: 48, fontSize: 30, fontWeight: 700, color: fg }}>
          <span style={{ marginRight: 16 }}>Arrasta pro lado</span>
          <Arrow color={fg} size={40} />
        </div>
      ) : null}
    </Frame>
  );
}

/** Foto de ponta a ponta no topo e texto no painel inferior, com selo numérico na emenda. */
function PhotoSplit(ctx: Ctx): ReactElement {
  const { bg, fg, accent } = colorsFor(ctx, ctx.theme.colors.bg);
  const { main, sub } = texts(ctx.content);
  const photoH = 600;
  const panelBg = ctx.theme.colors.primary;
  const badgeFg = readableOn(accent);
  const background = (
    <div style={{ position: "absolute", top: 0, left: 0, width: SLIDE_WIDTH, height: photoH, display: "flex", backgroundColor: panelBg }}>
      {ctx.image ? (
        <img src={ctx.image} width={SLIDE_WIDTH} height={photoH} alt="" style={{ width: SLIDE_WIDTH, height: photoH, objectFit: "cover" }} />
      ) : (
        <div
          style={{
            display: "flex",
            width: SLIDE_WIDTH,
            height: photoH,
            backgroundImage: `linear-gradient(135deg, ${panelBg} 0%, ${mix(panelBg, accent, 0.5)} 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SLIDE_WIDTH,
          height: 220,
          display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: PAD,
          bottom: -60,
          width: 120,
          height: 120,
          borderRadius: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: accent,
          color: badgeFg,
          fontFamily: ctx.heading,
          fontSize: 48,
          fontWeight: 900,
          border: `8px solid ${bg}`,
        }}
      >
        {pad2(ctx.position)}
      </div>
    </div>
  );
  return (
    <Frame ctx={ctx} bg={bg} fg={fg} accent={accent} background={background} header={false} decorate={false}>
      <div style={{ display: "flex", width: "100%", height: photoH - PAD + 40 }} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: ctx.justify("center"), gap: 26 }}>
        {ctx.content.kicker ? <Kicker text={ctx.content.kicker} color={accent} family={ctx.body} size={24} /> : null}
        <Rich
          text={main}
          size={ctx.fit(main, 66, 42, 36)}
          color={fg}
          accent={accent}
          mode={ctx.theme.highlight}
          markerText={fg}
          family={ctx.heading}
          weight={900}
          lineHeight={1.08}
          letterSpacing={-1}
          align={ctx.align("left")}
        />
        {sub ? (
          <Paragraphs text={sub} size={ctx.fit(sub, 34, 25, 150)} color={withAlpha(fg, 0.8)} accent={accent} mode={ctx.theme.highlight} family={ctx.body} align={ctx.align("left")} />
        ) : null}
      </div>
    </Frame>
  );
}

const LAYOUTS: Record<LayoutId, (ctx: Ctx) => ReactElement> = {
  "bold-hook": BoldHook,
  split: Split,
  numbered: Numbered,
  quote: Quote,
  "cta-strong": CtaStrong,
  minimal: Minimal,
  editorial: Editorial,
  tweet: Tweet,
  magazine: Magazine,
  checklist: Checklist,
  "big-stat": BigStat,
  glass: Glass,
  brutal: Brutal,
  "photo-cover": PhotoCover,
  "photo-split": PhotoSplit,
};

/** Selo do plano free: símbolo do slidely + nome. */
function Watermark({ fontFamily }: { fontFamily: string }) {
  const bg = "#0a0a0a";
  return (
    <div
      style={{
        position: "absolute",
        right: 36,
        bottom: 32,
        display: "flex",
        alignItems: "center",
        padding: "10px 22px 10px 16px",
        borderRadius: 999,
        backgroundColor: "rgba(10,10,10,0.78)",
        color: "#ffffff",
        fontFamily,
        fontSize: 28,
        fontWeight: 900,
        letterSpacing: -0.5,
      }}
    >
      <svg width={26} height={31} viewBox="12.5 9.5 39 46" fill="none" style={{ marginRight: 10 }}>
        <defs>
          <linearGradient id="wm-grad" gradientUnits="userSpaceOnUse" x1="0" y1="11" x2="0" y2="54">
            <stop offset="0" stopColor="#ff7a1a" />
            <stop offset="0.5" stopColor="#ff5b5d" />
            <stop offset="1" stopColor="#ff4d9d" />
          </linearGradient>
        </defs>
        <rect x="15.5" y="13" width="17" height="35" rx="3" transform="rotate(-12 24 30.5)" stroke="url(#wm-grad)" strokeWidth="2.4" />
        <rect x="31" y="15.5" width="17" height="35" rx="3" transform="rotate(11 39.5 33)" stroke={bg} strokeWidth="6" fill={bg} />
        <rect x="31" y="15.5" width="17" height="35" rx="3" transform="rotate(11 39.5 33)" stroke="url(#wm-grad)" strokeWidth="2.4" fill={bg} />
      </svg>
      slidely
    </div>
  );
}

/** Elemento 1080×1350 de um slide. Mesma árvore para Satori e navegador. */
export function renderSlide(slide: SlideRenderInput, options: RenderOptions): ReactElement {
  const resolveFont = options.resolveFont ?? serverFontResolver;
  const headingFamily: FontFamily = slide.content.headingFontOverride ?? options.theme.fonts.heading;
  const ctx: Ctx = {
    theme: options.theme,
    position: options.position,
    total: options.total,
    heading: resolveFont(headingFamily),
    body: resolveFont(options.theme.fonts.body),
    serif: resolveFont("Playfair Display"),
    content: slide.content,
    image: slide.image_url,
    grain: options.textures?.grain,
    fit: (text, max, min, budget) => Math.round(fit(text, max, min, budget) * (slide.content.textScale ?? 1)),
    align: (fallback) => slide.content.align ?? fallback,
    justify: (fallback) => {
      const v = slide.content.vAlign;
      return v === "top" ? "flex-start" : v === "bottom" ? "flex-end" : v === "center" ? "center" : fallback;
    },
  };
  const layoutId = resolveLayout(slide.layout, slide.content.role, options.position, options.total);
  const element = LAYOUTS[layoutId](ctx);

  if (!options.watermark) return element;

  return (
    <div style={{ position: "relative", display: "flex", width: SLIDE_WIDTH, height: SLIDE_HEIGHT }}>
      {element}
      <Watermark fontFamily={resolveFont("Inter")} />
    </div>
  );
}
