-- Corrige assert_owned_refs: PL/pgSQL não faz curto-circuito em "and", então
-- ler new.brand_kit_id num trigger de carousels quebrava ("record new has no field").
-- Separa em uma função por tabela. Idempotente.

drop trigger if exists projects_owned_refs on public.projects;
drop trigger if exists carousels_owned_refs on public.carousels;
drop function if exists public.assert_owned_refs();

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
