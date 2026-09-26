-- Painel de admin: auditoria e agregações por usuário.
-- Tudo aqui é acessível só pelo service_role; o acesso ao painel é decidido
-- no servidor pela variável ADMIN_EMAILS.

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  admin_email text not null,
  target_user_id uuid,
  target_email text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id, created_at desc);
create index if not exists generations_log_created_idx on public.generations_log (created_at desc);

alter table public.admin_audit_log enable row level security;
-- Sem policies: só o service_role lê e escreve.

-- Lista de usuários com métricas de uso. p_sort: recent | cost | generations | activity.
create or replace function public.admin_list_users(
  p_search text default null,
  p_plan text default null,
  p_sort text default 'recent',
  p_limit int default 25,
  p_offset int default 0
) returns table (
  id uuid,
  email text,
  full_name text,
  plan text,
  subscription_status text,
  monthly_generations int,
  monthly_reset_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  carousels bigint,
  generations_30d bigint,
  cost_30d numeric,
  cost_total numeric,
  last_generation_at timestamptz,
  total_count bigint
)
language sql stable security definer set search_path = '' as $$
  with base as (
    select p.*, u.last_sign_in_at, u.banned_until
    from public.profiles p
    left join auth.users u on u.id = p.id
    where (p_plan is null or p.plan = p_plan)
      and (
        p_search is null or p_search = ''
        or p.email ilike '%' || p_search || '%'
        or coalesce(p.full_name, '') ilike '%' || p_search || '%'
        or p.id::text = p_search
      )
  ),
  gen as (
    select g.user_id,
      count(*) filter (where g.created_at > now() - interval '30 days') as generations_30d,
      coalesce(sum(g.cost_usd) filter (where g.created_at > now() - interval '30 days'), 0) as cost_30d,
      coalesce(sum(g.cost_usd), 0) as cost_total,
      max(g.created_at) as last_generation_at
    from public.generations_log g
    where g.user_id in (select b.id from base b)
    group by g.user_id
  ),
  car as (
    select c.user_id, count(*) as carousels
    from public.carousels c
    where c.user_id in (select b.id from base b)
    group by c.user_id
  )
  select b.id, b.email, b.full_name, b.plan, b.subscription_status, b.monthly_generations,
    b.monthly_reset_at, b.created_at, b.last_sign_in_at, b.banned_until,
    coalesce(car.carousels, 0), coalesce(gen.generations_30d, 0), coalesce(gen.cost_30d, 0),
    coalesce(gen.cost_total, 0), gen.last_generation_at,
    count(*) over ()
  from base b
  left join gen on gen.user_id = b.id
  left join car on car.user_id = b.id
  order by
    case when p_sort = 'cost' then coalesce(gen.cost_30d, 0) end desc nulls last,
    case when p_sort = 'generations' then coalesce(gen.generations_30d, 0) end desc nulls last,
    case when p_sort = 'activity' then greatest(gen.last_generation_at, b.last_sign_in_at) end desc nulls last,
    b.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
$$;

-- Números gerais da plataforma.
create or replace function public.admin_overview()
returns table (
  total_users bigint,
  new_users_7d bigint,
  new_users_30d bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  plan_free bigint,
  plan_pro bigint,
  plan_business bigint,
  generations_30d bigint,
  cost_30d numeric,
  carousels_total bigint
)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    (select count(distinct user_id) from public.generations_log where created_at > now() - interval '7 days'),
    (select count(distinct user_id) from public.generations_log where created_at > now() - interval '30 days'),
    (select count(*) from public.profiles where plan = 'free'),
    (select count(*) from public.profiles where plan = 'pro'),
    (select count(*) from public.profiles where plan = 'business'),
    (select count(*) from public.generations_log where created_at > now() - interval '30 days'),
    (select coalesce(sum(cost_usd), 0) from public.generations_log where created_at > now() - interval '30 days'),
    (select count(*) from public.carousels);
$$;

-- Gerações e custo por dia (fuso de São Paulo). p_user_id null = plataforma inteira.
create or replace function public.admin_daily_usage(p_user_id uuid default null, p_days int default 30)
returns table (day date, generations bigint, cost numeric)
language sql stable security definer set search_path = '' as $$
  with days as (
    select generate_series(
      (now() at time zone 'America/Sao_Paulo')::date - (least(greatest(p_days, 1), 365) - 1),
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as day
  )
  select d.day, count(g.id), coalesce(sum(g.cost_usd), 0)
  from days d
  left join public.generations_log g
    on (g.created_at at time zone 'America/Sao_Paulo')::date = d.day
   and (p_user_id is null or g.user_id = p_user_id)
  group by d.day
  order by d.day;
$$;

revoke all on function public.admin_list_users(text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_daily_usage(uuid, int) from public, anon, authenticated;
grant execute on function public.admin_list_users(text, text, text, int, int) to service_role;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_daily_usage(uuid, int) to service_role;
