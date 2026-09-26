"use client";

import { ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ColorField } from "@/components/shared/ColorField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FONT_FAMILIES, type BrandColors, type FontFamily } from "@/lib/schemas/brandkit.zod";
import { Slider } from "@/components/ui/slider";
import {
  DECORATIONS,
  HIGHLIGHTS,
  TEXTURES,
  type Decoration,
  type Highlight,
  type Texture,
} from "@/lib/schemas/carousel.zod";
import { useEditor } from "@/lib/stores/editor.store";
import { uploadImage } from "@/lib/upload";
import { useEditorMeta } from "./EditorContext";

const DEFAULT = "default";

const DECORATION_LABEL: Record<Decoration, string> = {
  none: "Nenhuma",
  dots: "Pontilhado",
  grid: "Grade",
  glow: "Brilho",
  frame: "Moldura",
};

const HIGHLIGHT_LABEL: Record<Highlight, string> = { color: "Cor de destaque", marker: "Marca-texto", underline: "Sublinhado" };
const TEXTURE_LABEL: Record<Texture, string> = { none: "Liso", grain: "Grão de filme" };

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid rounded-lg border border-white/10 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
              value === o.value ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const COLOR_LABEL: Record<keyof BrandColors, string> = {
  primary: "Primária",
  secondary: "Secundária",
  accent: "Destaque",
  text: "Texto",
  bg: "Fundo",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</h3>;
}

export function ColorPanel() {
  const slide = useEditor((s) => s.slides[s.currentIndex]);
  const theme = useEditor((s) => s.theme);
  const updateContent = useEditor((s) => s.updateContent);
  const setImage = useEditor((s) => s.setImage);
  const setTheme = useEditor((s) => s.setTheme);
  const { userId, carouselId, brandKits } = useEditorMeta();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!slide) return null;
  const { content } = slide;

  async function onFile(file: File | undefined) {
    if (!file || !slide) return;
    setUploading(true);
    try {
      const url = await uploadImage("slide-images", userId, file, carouselId);
      setImage(slide.id, url);
      toast.success("Imagem adicionada. Ela aparece nos layouts Gancho forte e Editorial.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4" aria-label="Estilo deste slide">
        <SectionTitle>Este slide</SectionTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Tamanho do texto</span>
            <span className="tabular-nums">{Math.round((content.textScale ?? 1) * 100)}%</span>
          </div>
          <Slider
            min={70}
            max={140}
            step={5}
            value={[Math.round((content.textScale ?? 1) * 100)]}
            onValueChange={([v]) => updateContent(slide.id, { textScale: v === 100 ? undefined : v / 100 })}
            aria-label="Tamanho do texto"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Segmented
            label="Alinhamento"
            value={content.align ?? "left"}
            options={[
              { value: "left", label: "Esquerda" },
              { value: "center", label: "Centro" },
            ]}
            onChange={(align) => updateContent(slide.id, { align })}
          />
          <Segmented
            label="Posição"
            value={content.vAlign ?? "center"}
            options={[
              { value: "top", label: "Topo" },
              { value: "center", label: "Meio" },
              { value: "bottom", label: "Base" },
            ]}
            onChange={(vAlign) => updateContent(slide.id, { vAlign })}
          />
        </div>
        {slide.image_url ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Escurecer foto</span>
              <span className="tabular-nums">{Math.round((content.overlay ?? 0.7) * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[Math.round((content.overlay ?? 0.7) * 100)]}
              onValueChange={([v]) => updateContent(slide.id, { overlay: v / 100 })}
              aria-label="Escurecer foto"
            />
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <ColorField
            label="Fundo"
            value={content.bgOverride ?? theme.colors.bg}
            onChange={(hex) => updateContent(slide.id, { bgOverride: hex })}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Restaurar fundo padrão"
            disabled={!content.bgOverride}
            onClick={() => updateContent(slide.id, { bgOverride: undefined })}
          >
            <RotateCcw aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <ColorField
            label="Texto"
            value={content.textColorOverride ?? theme.colors.text}
            onChange={(hex) => updateContent(slide.id, { textColorOverride: hex })}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Restaurar cor de texto padrão"
            disabled={!content.textColorOverride}
            onClick={() => updateContent(slide.id, { textColorOverride: undefined })}
          >
            <RotateCcw aria-hidden />
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slide-font" className="text-xs text-muted-foreground">
            Fonte do título
          </Label>
          <Select
            value={content.headingFontOverride ?? DEFAULT}
            onValueChange={(value) =>
              updateContent(slide.id, { headingFontOverride: value === DEFAULT ? undefined : (value as FontFamily) })
            }
          >
            <SelectTrigger id="slide-font" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={DEFAULT}>Padrão do carrossel ({theme.fonts.heading})</SelectItem>
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Imagem</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            id="slide-image"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1" disabled={uploading}>
              <label htmlFor="slide-image" className="cursor-pointer">
                {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
                {slide.image_url ? "Trocar imagem" : "Enviar imagem"}
              </label>
            </Button>
            {slide.image_url ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remover imagem" onClick={() => setImage(slide.id, null)}>
                <Trash2 aria-hidden />
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">PNG ou JPG até 5 MB. Aparece nos layouts Gancho forte e Editorial.</p>
        </div>
      </section>

      <Separator />

      <section className="space-y-4" aria-label="Estilo do carrossel">
        <SectionTitle>Carrossel inteiro</SectionTitle>
        {brandKits.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="apply-kit" className="text-xs text-muted-foreground">
              Aplicar brand kit
            </Label>
            <Select
              value=""
              onValueChange={(id) => {
                const kit = brandKits.find((k) => k.id === id);
                if (!kit) return;
                setTheme({ colors: kit.colors, fonts: kit.fonts, handle: kit.handle, logoUrl: kit.logoUrl });
                toast.success(`Brand kit “${kit.name}” aplicado.`);
              }}
            >
              <SelectTrigger id="apply-kit" className="w-full">
                <SelectValue placeholder="Escolher brand kit…" />
              </SelectTrigger>
              <SelectContent>
                {brandKits.map((kit) => (
                  <SelectItem key={kit.id} value={kit.id}>
                    {kit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(COLOR_LABEL) as (keyof BrandColors)[]).map((key) => (
            <ColorField
              key={key}
              label={COLOR_LABEL[key]}
              value={theme.colors[key]}
              onChange={(hex) => setTheme({ colors: { ...theme.colors, [key]: hex } })}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(["heading", "body"] as const).map((slot) => (
            <div key={slot} className="space-y-1.5">
              <Label htmlFor={`font-${slot}`} className="text-xs text-muted-foreground">
                {slot === "heading" ? "Fonte dos títulos" : "Fonte do texto"}
              </Label>
              <Select
                value={theme.fonts[slot]}
                onValueChange={(value: FontFamily) => setTheme({ fonts: { ...theme.fonts, [slot]: value } })}
              >
                <SelectTrigger id={`font-${slot}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font} value={font}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="highlight" className="text-xs text-muted-foreground">
              Destaque (**palavra**)
            </Label>
            <Select value={theme.highlight} onValueChange={(value: Highlight) => setTheme({ highlight: value })}>
              <SelectTrigger id="highlight" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HIGHLIGHTS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {HIGHLIGHT_LABEL[h]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="texture" className="text-xs text-muted-foreground">
              Acabamento
            </Label>
            <Select value={theme.texture} onValueChange={(value: Texture) => setTheme({ texture: value })}>
              <SelectTrigger id="texture" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXTURES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEXTURE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brand-name" className="text-xs text-muted-foreground">
            Nome exibido (layout Post)
          </Label>
          <Input
            id="brand-name"
            value={theme.brandName}
            maxLength={60}
            placeholder="Seu nome ou marca"
            onChange={(e) => setTheme({ brandName: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="decoration" className="text-xs text-muted-foreground">
              Textura
            </Label>
            <Select value={theme.decoration} onValueChange={(value: Decoration) => setTheme({ decoration: value })}>
              <SelectTrigger id="decoration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECORATIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DECORATION_LABEL[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="handle" className="text-xs text-muted-foreground">
              @ do perfil
            </Label>
            <Input
              id="handle"
              value={theme.handle}
              maxLength={30}
              placeholder="seuperfil"
              onChange={(e) => setTheme({ handle: e.target.value.replace(/^@/, "").replace(/[^A-Za-z0-9._]/g, "") })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
