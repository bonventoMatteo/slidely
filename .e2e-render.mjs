import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { writeFileSync } from "node:fs";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SR, { auth: { persistSession: false } });
const email = `diag-render-${Date.now()}@mailinator.com`, password = "Diag-" + Math.random().toString(36).slice(2) + "!9";
const SRC = "9dea5da0-4ae0-4bf8-a034-2c78febea96e";
let userId;
try {
  const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (cu.error) throw cu.error; userId = cu.data.user.id;
  const { data: src } = await admin.from("carousels").select("title,prompt,theme,tone,slide_count").eq("id", SRC).single();
  const { data: slides } = await admin.from("slides").select("position,layout,content,image_url").eq("carousel_id", SRC).order("position");
  const { data: proj } = await admin.from("projects").insert({ user_id: userId, title: "diag" }).select("id").single();
  const { data: car } = await admin.from("carousels").insert({ ...src, project_id: proj.id, user_id: userId, status: "ready" }).select("id").single();
  await admin.from("slides").insert(slides.map((s) => ({ ...s, carousel_id: car.id })));
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const si = await anon.auth.signInWithPassword({ email, password }); if (si.error) throw si.error;
  const jar = new Map();
  const ssr = createServerClient(URL_, ANON, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)) } });
  await ssr.auth.setSession({ access_token: si.data.session.access_token, refresh_token: si.data.session.refresh_token });
  const cookie = [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
  for (const format of ["zip", "png"]) {
    const t0 = Date.now();
    const r = await fetch("http://localhost:3100/api/render", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ carouselId: car.id, format }) });
    const body = await r.json().catch(() => null);
    console.log(format, "->", r.status, `${Date.now() - t0}ms`, body?.error ?? `${body?.files?.length} arquivo(s)`);
    if (format === "png" && body?.files?.[0]) { const g = await fetch(body.files[0].url); const buf = Buffer.from(await g.arrayBuffer()); writeFileSync(process.env.OUT, buf); console.log("   slide 1:", g.status, buf.byteLength, "bytes"); }
  }
} catch (e) { console.error("FALHOU:", e?.message ?? e); }
finally {
  if (userId) {
    const { data: files } = await admin.storage.from("exports").list(userId, { limit: 100 });
    for (const f of files ?? []) { const { data: inner } = await admin.storage.from("exports").list(`${userId}/${f.name}`, { limit: 100 }); if (inner?.length) await admin.storage.from("exports").remove(inner.map((i) => `${userId}/${f.name}/${i.name}`)); }
    const d = await admin.auth.admin.deleteUser(userId); console.log("limpeza:", d.error ? "ERRO " + d.error.message : "ok");
  }
}
