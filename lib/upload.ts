"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };

/**
 * Envia uma imagem para um bucket público em {userId}/{pasta}/ e devolve a URL pública.
 * Só PNG/JPEG: são os formatos que o renderizador (Satori) suporta.
 */
export async function uploadImage(bucket: "logos" | "slide-images", userId: string, file: File, folder?: string) {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("Use uma imagem PNG ou JPG.");
  if (file.size > MAX_BYTES) throw new Error("A imagem precisa ter no máximo 5 MB.");

  const supabase = createClient();
  const path = `${userId}/${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
