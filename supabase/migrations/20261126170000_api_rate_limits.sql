-- Segurança: limite de uso por aluno nas rotas de IA (apps/web/lib/entitlement.ts).
-- Antes só o /api/assistant tinha limite (charlotte.rate_limits, uma linha por aluno). Aqui, uma contagem por rota,
-- por hora e por dia (dia no fuso de Brasília), somada de forma atômica. Só o servidor lê e grava.
begin;

create table if not exists public.api_rate_limits (
  user_id      uuid not null,
  bucket       text not null,          -- '<rota>:h' ou '<rota>:d'
  window_start timestamptz not null,
  n            integer not null default 0,
  primary key (user_id, bucket, window_start)
);
create index if not exists api_rate_limits_window on public.api_rate_limits (window_start);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

-- Conta 1 pedido na hora e no dia da rota. Passou do limite: { ok: false, scope: 'hour' | 'day', retry_after (s) }.
create or replace function public.api_rate_hit(p_user uuid, p_route text, p_hour_max integer, p_day_max integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_route text := left(coalesce(p_route, ''), 60);
  v_hour  timestamptz := date_trunc('hour', now());
  v_day   timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_nh integer; v_nd integer;
begin
  insert into public.api_rate_limits (user_id, bucket, window_start, n) values (p_user, v_route || ':h', v_hour, 1)
    on conflict (user_id, bucket, window_start) do update set n = api_rate_limits.n + 1
    returning n into v_nh;
  insert into public.api_rate_limits (user_id, bucket, window_start, n) values (p_user, v_route || ':d', v_day, 1)
    on conflict (user_id, bucket, window_start) do update set n = api_rate_limits.n + 1
    returning n into v_nd;
  -- Limpeza de janelas velhas, de vez em quando.
  if random() < 0.005 then
    delete from public.api_rate_limits where window_start < now() - interval '3 days';
  end if;
  if p_hour_max is not null and v_nh > p_hour_max then
    return jsonb_build_object('ok', false, 'scope', 'hour',
      'retry_after', greatest(1, ceil(extract(epoch from (v_hour + interval '1 hour') - now()))::integer));
  end if;
  if p_day_max is not null and v_nd > p_day_max then
    return jsonb_build_object('ok', false, 'scope', 'day',
      'retry_after', greatest(1, ceil(extract(epoch from (v_day + interval '1 day') - now()))::integer));
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.api_rate_hit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.api_rate_hit(uuid, text, integer, integer) to service_role;

commit;
