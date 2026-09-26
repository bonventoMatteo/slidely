const TZ = "America/Sao_Paulo";

export function formatUSD(value: number | string | null | undefined, digits = 2): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(
    Number(value ?? 0),
  );
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(value));
}

/** "há 3 dias", "há 2 h"… */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "nunca";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.round(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  return `há ${Math.round(months / 12)} a`;
}
