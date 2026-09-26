import { z } from "zod";

export const projectInputSchema = z.object({
  title: z.string().trim().min(1, "Informe um nome").max(80, "Máximo de 80 caracteres"),
  niche: z.string().trim().max(80, "Máximo de 80 caracteres").optional(),
  brand_kit_id: z.uuid().nullable().optional(),
});
export type ProjectInput = z.infer<typeof projectInputSchema>;
