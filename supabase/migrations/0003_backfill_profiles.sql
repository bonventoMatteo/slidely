-- Cria profiles para usuários que já existiam em auth.users antes do trigger
-- on_auth_user_created (ex.: contas criadas antes de aplicar a 0001).
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', '')
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
