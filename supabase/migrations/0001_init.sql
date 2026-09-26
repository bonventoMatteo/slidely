-- CarrosselAI — schema inicial
-- Aplicar com: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique not null,
  full_name text,
  plan text not null default 'free' check (plan in ('free','pro','business')),
  monthly_generations int not null default 0,
  monthly_reset_at timestamptz not null default now(),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamptz not null default now()
);

create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  colors jsonb not null default '{"primary":"#000000","secondary":"#ffffff","accent":"#f97316","text":"#111111","bg":"#fafafa"}',
  fonts jsonb not null default '{"heading":"Inter","body":"Inter"}',
  logo_url text,
  handle text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  niche text,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  preview_url text,
  layout_json jsonb not null,
  required_plan text not null default 'free' check (required_plan in ('free','pro','business')),
  sort_order int not null default 0,
  is_public boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.carousels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  prompt text not null,
  source_url text,
  tone text not null default 'profissional',
  slide_count int not null default 7,
  template_id uuid references public.templates(id) on delete set null,
  -- Tema resolvido na criação (template + brand kit). Editável no editor sem alterar o brand kit.
  theme jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','generating','ready','error')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slides (
  id uuid primary key default gen_random_uuid(),
  carousel_id uuid references public.carousels(id) on delete cascade not null,
  position int not null,
  layout text not null default 'default',
  content jsonb not null,           -- {role,hook,title,body,cta,visual_hint,bgOverride,textColorOverride,headingFontOverride}
  image_url text,
  -- Deferível: permite reordenar todos os slides numa única transação.
  constraint slides_carousel_position_key unique (carousel_id, position) deferrable initially deferred
);

create table public.generations_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  carousel_id uuid references public.carousels(id) on delete set null,
  kind text not null default 'carousel' check (kind in ('carousel','slide')),
  model text not null,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(10,6),
  created_at timestamptz not null default now()
);

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index brand_kits_user_idx on public.brand_kits (user_id);
create index projects_user_idx on public.projects (user_id, updated_at desc);
create index carousels_project_idx on public.carousels (project_id, created_at desc);
create index carousels_user_idx on public.carousels (user_id, updated_at desc);
create index generations_log_user_idx on public.generations_log (user_id, created_at desc);
create index rate_limit_hits_lookup_idx on public.rate_limit_hits (user_id, bucket, created_at desc);
create index templates_order_idx on public.templates (sort_order);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Cria profile ao criar user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger carousels_updated_at before update on public.carousels
  for each row execute function public.set_updated_at();

-- Limite de brand kits por plano (free 1, pro 5, business 20), garantido no banco.
create or replace function public.enforce_brand_kit_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  select plan into v_plan from public.profiles where id = new.user_id;
  v_limit := case v_plan when 'business' then 20 when 'pro' then 5 else 1 end;
  select count(*) into v_count from public.brand_kits where user_id = new.user_id;
  if v_count >= v_limit then
    raise exception 'brand_kit_limit_reached' using errcode = 'P0001',
      hint = format('Seu plano permite %s brand kit(s).', v_limit);
  end if;
  return new;
end $$;

create trigger brand_kits_limit before insert on public.brand_kits
  for each row execute function public.enforce_brand_kit_limit();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.brand_kits      enable row level security;
alter table public.projects        enable row level security;
alter table public.carousels       enable row level security;
alter table public.slides          enable row level security;
alter table public.templates       enable row level security;
alter table public.generations_log enable row level security;
alter table public.rate_limit_hits enable row level security; -- sem policies: só service role

create policy "own profile"       on public.profiles   for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "own brand_kits"    on public.brand_kits for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own projects"      on public.projects   for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own carousels"     on public.carousels  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own slides"        on public.slides     for all using (
  exists (select 1 from public.carousels c where c.id=slides.carousel_id and c.user_id=auth.uid())
) with check (
  exists (select 1 from public.carousels c where c.id=slides.carousel_id and c.user_id=auth.uid())
);
create policy "public templates read" on public.templates for select using (is_public=true or created_by=auth.uid());
create policy "own generations"   on public.generations_log for select using (auth.uid()=user_id);

-- Plano, contadores e dados de billing só mudam pelo servidor (service role).
-- Sem isso, "own profile" permitiria ao usuário se promover para 'business'.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Projetos/carrosséis precisam apontar para recursos do próprio usuário.
-- Uma função por tabela: PL/pgSQL não faz curto-circuito ao ler campos de NEW.
create or replace function public.assert_project_refs() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.brand_kit_id is not null and not exists (
    select 1 from public.brand_kits b where b.id = new.brand_kit_id and b.user_id = new.user_id
  ) then
    raise exception 'brand_kit_not_found' using errcode = 'P0002';
  end if;
  return new;
end $$;

create or replace function public.assert_carousel_refs() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'project_not_found' using errcode = 'P0002';
  end if;
  return new;
end $$;

create trigger projects_owned_refs before insert or update of brand_kit_id, user_id on public.projects
  for each row execute function public.assert_project_refs();
create trigger carousels_owned_refs before insert or update of project_id, user_id on public.carousels
  for each row execute function public.assert_carousel_refs();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Reserva 1 geração da quota mensal (atômico). p_limit < 0 = ilimitado.
-- Reseta o contador quando monthly_reset_at tem mais de 30 dias.
create or replace function public.consume_generation_quota(p_user_id uuid, p_limit int)
returns table (allowed boolean, used int, reset_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_reset timestamptz;
begin
  select p.monthly_generations, p.monthly_reset_at into v_used, v_reset
  from public.profiles p where p.id = p_user_id for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if v_reset < now() - interval '30 days' then
    v_used := 0;
    v_reset := now();
    update public.profiles set monthly_generations = 0, monthly_reset_at = v_reset where id = p_user_id;
  end if;

  if p_limit >= 0 and v_used >= p_limit then
    return query select false, v_used, v_reset;
    return;
  end if;

  update public.profiles set monthly_generations = monthly_generations + 1
  where id = p_user_id returning monthly_generations into v_used;

  return query select true, v_used, v_reset;
end $$;

-- Devolve uma geração reservada quando a chamada à IA falha.
create or replace function public.refund_generation_quota(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.profiles
  set monthly_generations = greatest(monthly_generations - 1, 0)
  where id = p_user_id;
$$;

-- Janela deslizante: retorna false quando o usuário excedeu p_limit hits em p_window_seconds.
create or replace function public.consume_rate_limit(
  p_user_id uuid, p_bucket text, p_limit int, p_window_seconds int
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_bucket, 0));

  delete from public.rate_limit_hits
  where user_id = p_user_id and bucket = p_bucket
    and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count from public.rate_limit_hits
  where user_id = p_user_id and bucket = p_bucket;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_hits (user_id, bucket) values (p_user_id, p_bucket);
  return true;
end $$;

revoke all on function public.consume_generation_quota(uuid, int) from public, anon, authenticated;
revoke all on function public.refund_generation_quota(uuid) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.consume_generation_quota(uuid, int) to service_role;
grant execute on function public.refund_generation_quota(uuid) to service_role;
grant execute on function public.consume_rate_limit(uuid, text, int, int) to service_role;

-- Salva todos os slides de um carrossel numa transação (auto-save do editor).
-- Remove os slides ausentes, faz upsert dos enviados e reordena sem violar a unique.
-- security invoker: RLS continua valendo.
create or replace function public.save_carousel_slides(p_carousel_id uuid, p_slides jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.carousels c where c.id = p_carousel_id and c.user_id = auth.uid()
  ) then
    raise exception 'carousel_not_found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_slides) <> 'array'
     or jsonb_array_length(p_slides) = 0
     or jsonb_array_length(p_slides) > 20 then
    raise exception 'invalid_slides' using errcode = '22023';
  end if;

  if exists (select 1 from jsonb_array_elements(p_slides) s where s->>'id' is null) then
    raise exception 'slide_id_required' using errcode = '22023';
  end if;

  delete from public.slides
  where carousel_id = p_carousel_id
    and id not in (select (s->>'id')::uuid from jsonb_array_elements(p_slides) s);

  insert into public.slides (id, carousel_id, position, layout, content, image_url)
  select (s->>'id')::uuid,
         p_carousel_id,
         (s->>'position')::int,
         coalesce(s->>'layout', 'default'),
         s->'content',
         s->>'image_url'
  from jsonb_array_elements(p_slides) s
  on conflict (id) do update
    set position = excluded.position,
        layout = excluded.layout,
        content = excluded.content,
        image_url = excluded.image_url
    where public.slides.carousel_id = p_carousel_id;

  update public.carousels
  set slide_count = jsonb_array_length(p_slides)
  where id = p_carousel_id;
end $$;

revoke all on function public.save_carousel_slides(uuid, jsonb) from public, anon;
grant execute on function public.save_carousel_slides(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id,name,public) values ('logos','logos',true) on conflict do nothing;
insert into storage.buckets (id,name,public) values ('exports','exports',false) on conflict do nothing;
insert into storage.buckets (id,name,public) values ('slide-images','slide-images',true) on conflict do nothing;

create policy "logos read"   on storage.objects for select using (bucket_id='logos');
create policy "logos write"  on storage.objects for insert with check (bucket_id='logos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "logos update" on storage.objects for update using (bucket_id='logos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "logos delete" on storage.objects for delete using (bucket_id='logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "slide images read"   on storage.objects for select using (bucket_id='slide-images');
create policy "slide images write"  on storage.objects for insert with check (bucket_id='slide-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "slide images delete" on storage.objects for delete using (bucket_id='slide-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "exports own read"   on storage.objects for select using (bucket_id='exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports own write"  on storage.objects for insert with check (bucket_id='exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports own update" on storage.objects for update using (bucket_id='exports' and auth.uid()::text = (storage.foldername(name))[1]);
