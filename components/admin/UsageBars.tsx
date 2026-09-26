import { formatDate, formatUSD } from "@/lib/format";

export type DailyUsage = { day: string; generations: number; cost: number };

/** Barras de gerações por dia. Série única: o título do card nomeia a métrica. */
export function UsageBars({ data, label }: { data: DailyUsage[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.generations));
  const total = data.reduce((sum, d) => sum + d.generations, 0);
  const cost = data.reduce((sum, d) => sum + d.cost, 0);

  return (
    <figure className="rounded-2xl border border-white/10 bg-card/40 p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-sm tabular-nums">
          <strong>{total}</strong> gerações · <strong>{formatUSD(cost)}</strong> de IA
        </span>
      </figcaption>
      <div className="relative mt-5 h-36">
        <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-white/10" />
        <span aria-hidden className="absolute -top-2.5 right-0 bg-card px-1 text-[10px] text-muted-foreground tabular-nums">
          {max}
        </span>
        <ul className="flex h-full items-end gap-[2px] border-b border-white/15" aria-label={`${label}, por dia`}>
          {data.map((d) => (
            <li key={d.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-primary/80 transition-colors group-hover:bg-primary"
                style={{ height: d.generations ? `${Math.max(3, (d.generations / max) * 100)}%` : 0 }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-popover px-2 py-1 text-xs shadow-lg group-hover:block">
                {formatDate(`${d.day}T12:00:00Z`)} · {d.generations} · {formatUSD(d.cost)}
              </span>
              <span className="sr-only">
                {formatDate(`${d.day}T12:00:00Z`)}: {d.generations} gerações, {formatUSD(d.cost)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0] ? formatDate(`${data[0].day}T12:00:00Z`) : ""}</span>
        <span>hoje</span>
      </div>
    </figure>
  );
}
