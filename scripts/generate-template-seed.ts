/**
 * Gera supabase/migrations/0002_seed_templates.sql a partir de lib/templates-catalog.ts.
 * Uso: pnpm seed:templates
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { templateLayoutSchema } from "../lib/schemas/carousel.zod";
import { TEMPLATE_CATALOG } from "../lib/templates-catalog";

const q = (value: string | null) => (value === null ? "null" : `'${value.replace(/'/g, "''")}'`);

const rows = TEMPLATE_CATALOG.map((template, index) => {
  const layout = templateLayoutSchema.parse({ ...template.layout, sample: template.sample });
  return `  (${q(template.id)}, ${q(template.name)}, ${q(template.description)}, ${q(template.category)}, ${q(
    JSON.stringify(layout),
  )}::jsonb, ${q(template.requiredPlan)}, ${index + 1}, true)`;
});

const sql = `-- Gerado por scripts/generate-template-seed.ts — não edite à mão.
-- ${TEMPLATE_CATALOG.length} templates públicos.

insert into public.templates (id, name, description, category, layout_json, required_plan, sort_order, is_public)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  layout_json = excluded.layout_json,
  required_plan = excluded.required_plan,
  sort_order = excluded.sort_order,
  is_public = excluded.is_public;
`;

const target = path.join(process.cwd(), "supabase", "migrations", "0002_seed_templates.sql");
writeFileSync(target, sql);
console.log(`OK: ${TEMPLATE_CATALOG.length} templates → ${path.relative(process.cwd(), target)}`);
