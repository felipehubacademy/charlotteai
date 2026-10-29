-- Contagem de pedidos às rotas de IA sem prova de login (por dia e rota), para saber quando dá para exigir o login
-- sem derrubar quem ainda usa versão antiga do app. Só o servidor grava e lê.
create table if not exists public.api_auth_misses (
  day date not null,
  route text not null,
  n integer not null default 0,
  primary key (day, route)
);
alter table public.api_auth_misses enable row level security;
revoke all on public.api_auth_misses from anon, authenticated;

create or replace function public.note_api_auth_miss(p_route text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.api_auth_misses (day, route, n) values ((now() at time zone 'America/Sao_Paulo')::date, left(p_route, 80), 1)
  on conflict (day, route) do update set n = api_auth_misses.n + 1;
$$;
revoke execute on function public.note_api_auth_miss(text) from public, anon, authenticated;
grant execute on function public.note_api_auth_miss(text) to service_role;
