"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BrandKitPicker, NO_BRAND_KIT } from "@/components/brand-kit/Picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { BrandKitOption } from "@/lib/types";
import { InlineRename } from "./InlineRename";

export function ProjectTitle({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <InlineRename
      value={title}
      label="Renomear projeto"
      className="max-w-full"
      inputClassName="h-11 text-2xl font-black"
      onCommit={async (next) => {
        const { error } = await createClient().from("projects").update({ title: next }).eq("id", id);
        if (error) {
          toast.error("Não foi possível renomear.");
          return false;
        }
        router.refresh();
        return true;
      }}
    />
  );
}

export function ProjectSettings({
  id,
  niche,
  brandKitId,
  brandKits,
}: {
  id: string;
  niche: string | null;
  brandKitId: string | null;
  brandKits: BrandKitOption[];
}) {
  const router = useRouter();
  const [nicheValue, setNicheValue] = useState(niche ?? "");
  const [kit, setKit] = useState(brandKitId ?? NO_BRAND_KIT);

  async function save(patch: { niche?: string | null; brand_kit_id?: string | null }) {
    const { error } = await createClient().from("projects").update(patch).eq("id", id);
    if (error) {
      toast.error("Não foi possível salvar.");
      return false;
    }
    toast.success("Projeto atualizado.");
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="project-niche">Nicho padrão</Label>
        <Input
          id="project-niche"
          value={nicheValue}
          maxLength={80}
          placeholder="Ex.: nutrição esportiva"
          onChange={(e) => setNicheValue(e.target.value)}
          onBlur={() => {
            const next = nicheValue.trim();
            if (next !== (niche ?? "")) void save({ niche: next || null });
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-kit">Brand kit padrão</Label>
        <BrandKitPicker
          id="project-kit"
          value={kit}
          brandKits={brandKits}
          onChange={async (value) => {
            const previous = kit;
            setKit(value);
            const ok = await save({ brand_kit_id: value === NO_BRAND_KIT ? null : value });
            if (!ok) setKit(previous);
          }}
        />
      </div>
    </div>
  );
}
