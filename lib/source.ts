import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { Agent, fetch } from "undici";
import { ApiError } from "@/lib/api";

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_CHARS = 12_000;
const TIMEOUT_MS = 10_000;
const BLOCKED_STATUSES = new Set([401, 403, 429, 503]);

/** Faixas que nunca devem ser acessadas a partir do servidor (SSRF). */
const blocked = new BlockList();
[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].forEach(([net, prefix]) => blocked.addSubnet(net as string, prefix as number, "ipv4"));
[
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
].forEach(([net, prefix]) => blocked.addSubnet(net as string, prefix as number, "ipv6"));

function isBlockedAddress(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return blocked.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) return blocked.check(address, "ipv6");
  return true;
}

/**
 * Lookup que valida o IP resolvido no momento da conexão — impede DNS rebinding
 * e redirects para endereços internos.
 */
const safeLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as LookupAddress[];
    const allowed = list.filter((a) => !isBlockedAddress(a.address));
    if (allowed.length === 0 || allowed.length !== list.length) {
      return callback(new Error("blocked_address"), "", 0);
    }
    if (options.all) {
      (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, allowed);
    } else {
      callback(null, allowed[0].address, allowed[0].family);
    }
  });
};

const agent = new Agent({
  connect: { lookup: safeLookup, timeout: TIMEOUT_MS },
});

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const n = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    if (code.startsWith("#")) {
      const n = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

function pick(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

function pickAll(html: string, tag: string): string[] {
  return Array.from(html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi")), (m) => m[1]);
}

function metaContent(html: string, key: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
  const reversed = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  return html.match(re)?.[1] ?? html.match(reversed)?.[1] ?? null;
}

/** Procura `articleBody` nos blocos JSON-LD (a maioria dos portais publica a matéria inteira ali). */
function jsonLdArticleBody(html: string): string | null {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    (m) => m[1],
  );
  let best: string | null = null;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === "articleBody" && typeof value === "string" && value.length > (best?.length ?? 0)) best = value;
      else if (typeof value === "object") visit(value);
    }
  };
  for (const raw of blocks) {
    try {
      visit(JSON.parse(raw.trim()));
    } catch {
      // JSON-LD malformado: ignora.
    }
  }
  return best;
}

/** Converte um trecho de HTML em linhas de texto legíveis, descartando navegação e menus. */
function fragmentToText(fragment: string): string {
  const withoutChrome = fragment
    .replace(/<(nav|footer|header|aside|form|figure|button|select)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutChrome)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 40)
    .join("\n");
}

const ENOUGH_TEXT = 600;

/** Extrai título e texto principal de uma página HTML. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeEntities((metaContent(html, "og:title") ?? pick(html, "title") ?? "").trim()).slice(0, 200);
  const description = decodeEntities((metaContent(html, "og:description") ?? metaContent(html, "description") ?? "").trim());

  const fromJsonLd = jsonLdArticleBody(html);
  if (fromJsonLd && fromJsonLd.length >= ENOUGH_TEXT) {
    return { title, text: decodeEntities(fromJsonLd.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").trim() };
  }

  const clean = html.replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ");
  // Todos os <article> (não só o primeiro, que costuma ser um card de "leia também"), depois <main>, depois <body>.
  const candidates = [
    pickAll(clean, "article").join("\n"),
    pick(clean, "main") ?? "",
    pick(clean, "body") ?? clean,
  ].map(fragmentToText);

  const chosen = candidates.find((text) => text.length >= ENOUGH_TEXT) ?? candidates.reduce((a, b) => (b.length > a.length ? b : a), "");
  const text = description && !chosen.includes(description.slice(0, 60)) ? `${description}\n${chosen}` : chosen;
  return { title, text };
}

async function readLimited(res: Awaited<ReturnType<typeof fetch>>): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

export type SourceDocument = { url: string; title: string; text: string };

/** Baixa e extrai o texto de uma matéria para servir de base ao carrossel. */
export async function fetchSource(rawUrl: string): Promise<SourceDocument> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiError(400, "invalid_source_url", "Link inválido.");
  }

  for (let hop = 0; hop <= 3; hop++) {
    if (!["http:", "https:"].includes(url.protocol) || (url.port && !["80", "443"].includes(url.port))) {
      throw new ApiError(400, "invalid_source_url", "Use um link http(s) público.");
    }
    if (isIP(url.hostname.replace(/^\[|\]$/g, "")) && isBlockedAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
      throw new ApiError(400, "invalid_source_url", "Esse endereço não pode ser acessado.");
    }

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; slidely/1.0)",
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.6",
        },
      });
    } catch {
      throw new ApiError(422, "source_unreachable", "Não consegui acessar esse link. Confira se ele é público.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      url = new URL(location, url);
      continue;
    }

    if (BLOCKED_STATUSES.has(res.status)) {
      // Proteção anti-bot (ex.: Cloudflare). A rota tenta o leitor da Anthropic como fallback.
      throw new ApiError(422, "source_blocked", `O site bloqueou a leitura automática (erro ${res.status}).`);
    }
    if (!res.ok) {
      throw new ApiError(422, "source_unreachable", `O link respondeu com erro ${res.status}.`);
    }

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("text/plain") && !type.includes("xhtml")) {
      throw new ApiError(422, "source_unsupported", "O link precisa apontar para uma página de texto (matéria, artigo, post).");
    }

    const raw = await readLimited(res);
    const { title, text } = type.includes("text/plain") ? { title: "", text: raw } : htmlToText(raw);
    if (text.length < 200) {
      throw new ApiError(422, "source_empty", "Não encontrei texto suficiente nesse link. Tente outro ou descreva o tema.");
    }
    return { url: url.toString(), title: title || url.hostname, text: text.slice(0, MAX_CHARS) };
  }

  throw new ApiError(422, "source_unreachable", "O link redirecionou vezes demais.");
}

/** Detecta quando o usuário colou só um link no campo de tema. */
export function extractUrlFromPrompt(prompt: string): string | null {
  const trimmed = prompt.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}
