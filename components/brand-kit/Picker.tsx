"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BrandKitOption } from "@/lib/types";

export const NO_BRAND_KIT = "none";

/** Select de brand kit com amostra das cores. */
export function BrandKitPicker({
  id,
  value,
  onChange,
  brandKits,
  emptyLabel = "Nenhum",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  brandKits: BrandKitOption[];
  emptyLabel?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_BRAND_KIT}>{emptyLabel}</SelectItem>
        {brandKits.map((kit) => (
          <SelectItem key={kit.id} value={kit.id}>
            <span className="flex items-center gap-2">
              <span className="flex" aria-hidden>
                {[kit.colors.primary, kit.colors.accent, kit.colors.bg].map((c, i) => (
                  <span key={i} className="-ml-1 size-3 rounded-full border border-black/30 first:ml-0" style={{ background: c }} />
                ))}
              </span>
              {kit.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
