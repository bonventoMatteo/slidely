"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ColorField } from "@/components/shared/ColorField";
import { SlidePreview } from "@/components/slide/SlidePreview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  brandColorsSchema,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_FONTS,
  FONT_FAMILIES,
  fontFamilySchema,
  type BrandColors,
} from "@/lib/schemas/brandkit.zod";
import { DEFAULT_THEME } from "@/lib/schemas/carousel.zod";
import { createClient } from "@/lib/supabase/client";
import type { BrandKitOption } from "@/lib/types";
import { uploadImage } from "@/lib/upload";

const formSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(60, "Máximo de 60 caracteres"),
  colors: brandColorsSchema,
  fonts: z.object({ heading: fontFamilySchema, body: fontFamilySchema }),
  handle: z
    .string()
    .trim()
    .max(31, "Máximo de 30 caracteres")
    .regex(/^@?[A-Za-z0-9._]*$/, "Use letras, números, ponto e underline"),
  logoUrl: z.string().nullable(),
});
type FormValues = z.input<typeof formSchema>;

const COLOR_FIELDS: { key: keyof BrandColors; label: string }[] = [
  { key: "primary", label: "Primária" },
  { key: "secondary", label: "Secundária" },
  { key: "accent", label: "Destaque" },
  { key: "text", label: "Texto" },
  { key: "bg", label: "Fundo" },
];

export function BrandKitEditor({
  open,
  onOpenChange,
  kit,
  userId,
  onSaved,
  onLimitReached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kit: BrandKitOption | null;
  userId: string;
  onSaved: (kit: BrandKitOption) => void;
  onLimitReached: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: {
      name: kit?.name ?? "",
      colors: kit?.colors ?? DEFAULT_BRAND_COLORS,
      fonts: kit?.fonts ?? DEFAULT_BRAND_FONTS,
      handle: kit?.handle ?? "",
      logoUrl: kit?.logoUrl ?? null,
    },
  });

  const watched = useWatch({ control: form.control });
  const previewTheme = {
    ...DEFAULT_THEME,
    colors: { ...DEFAULT_BRAND_COLORS, ...watched.colors },
    fonts: {
      heading: watched.fonts?.heading ?? DEFAULT_BRAND_FONTS.heading,
      body: watched.fonts?.body ?? DEFAULT_BRAND_FONTS.body,
    },
    handle: (watched.handle ?? "").replace(/^@/, ""),
    logoUrl: watched.logoUrl ?? null,
  };

  async function onSubmit(values: FormValues) {
    const parsed = formSchema.parse(values);
    const payload = {
      name: parsed.name,
      colors: parsed.colors,
      fonts: parsed.fonts,
      handle: parsed.handle.replace(/^@/, "") || null,
      logo_url: parsed.logoUrl,
    };
    const supabase = createClient();
    const query = kit
      ? supabase.from("brand_kits").update(payload).eq("id", kit.id)
      : supabase.from("brand_kits").insert({ ...payload, user_id: userId });
    const { data, error } = await query.select("id").single();

    if (error || !data) {
      if (error?.message.includes("brand_kit_limit_reached")) {
        onLimitReached();
        return;
      }
      toast.error("Não foi possível salvar o brand kit.");
      return;
    }
    onSaved({
      id: data.id,
      name: payload.name,
      colors: payload.colors,
      fonts: payload.fonts,
      handle: payload.handle ?? "",
      logoUrl: payload.logo_url,
    });
    toast.success(kit ? "Brand kit atualizado." : "Brand kit criado.");
    onOpenChange(false);
  }

  async function onLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage("logos", userId, file);
      form.setValue("logoUrl", url, { shouldDirty: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{kit ? "Editar brand kit" : "Novo brand kit"}</DialogTitle>
          <DialogDescription>Cores, fontes, @ e logo aplicados automaticamente nos seus carrosséis.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-8 md:grid-cols-[1fr_240px]">
          <Form {...form}>
            <form id="brand-kit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Minha marca" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Cores</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {COLOR_FIELDS.map(({ key, label }) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`colors.${key}`}
                      render={({ field }) => <ColorField label={label} value={field.value} onChange={field.onChange} />}
                    />
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                {(["heading", "body"] as const).map((slot) => (
                  <FormField
                    key={slot}
                    control={form.control}
                    name={`fonts.${slot}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{slot === "heading" ? "Fonte dos títulos" : "Fonte do texto"}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FONT_FAMILIES.map((font) => (
                              <SelectItem key={font} value={font}>
                                {font}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormField
                control={form.control}
                name="handle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>@ do Instagram</FormLabel>
                    <FormControl>
                      <Input placeholder="seuperfil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <span className="text-sm font-medium">Logo</span>
                <div className="flex items-center gap-3">
                  {watched.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Storage
                    <img src={watched.logoUrl} alt="Logo atual" className="size-12 rounded-lg border border-white/10 object-contain" />
                  ) : null}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={(e) => onLogo(e.target.files?.[0])}
                  />
                  <Button asChild variant="outline" size="sm" disabled={uploading}>
                    <label htmlFor="logo-upload" className="cursor-pointer">
                      {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
                      {watched.logoUrl ? "Trocar logo" : "Enviar logo"}
                    </label>
                  </Button>
                  {watched.logoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover logo"
                      onClick={() => form.setValue("logoUrl", null, { shouldDirty: true })}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">PNG ou JPG até 5 MB. Prefira fundo transparente.</p>
              </div>
            </form>
          </Form>
          <div className="space-y-3" aria-label="Prévia">
            <p className="text-sm font-medium">Prévia</p>
            <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
              <SlidePreview
                slide={{ layout: "bold-hook", content: { role: "hook", hook: "Seu gancho aparece assim", title: "", body: "" }, image_url: null }}
                theme={previewTheme}
                position={1}
                total={7}
                width={240}
              />
            </div>
            <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
              <SlidePreview
                slide={{
                  layout: "numbered",
                  content: { role: "content", title: "Título do slide", body: "O corpo do texto usa a fonte e a cor que você escolheu." },
                  image_url: null,
                }}
                theme={previewTheme}
                position={2}
                total={7}
                width={240}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="brand-kit-form" disabled={form.formState.isSubmitting || uploading}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
