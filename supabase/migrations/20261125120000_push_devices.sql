-- Push em todos os aparelhos da conta (25/11/2026).
-- Antes a conta guardava um token só (charlotte.users.expo_push_token): o último aparelho que abria o app
-- levava todos os pushes. Ex.: a conta de teste do Felipe testada no Samsung deixou o iPhone dele sem push
-- de 18 a 24/11. Agora cada aparelho fica em charlotte.push_devices e o envio (sendExpoPush) manda cópia
-- para os outros aparelhos da mesma conta. expo_push_token continua sendo o aparelho mais recente: todas as
-- funções e rotas que escolhem QUEM recebe seguem iguais.
--
-- O app não muda: ele já grava o token em charlotte_users a cada abertura; o gatilho abaixo registra o
-- aparelho. Um aparelho pertence a uma conta só (o mesmo celular com outra conta passa a ser dela).

create table if not exists charlotte.push_devices (
  token        text primary key,
  user_id      uuid not null references charlotte.users(id) on delete cascade,
  platform     text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists push_devices_user_idx on charlotte.push_devices (user_id);

alter table charlotte.push_devices enable row level security;
revoke all on charlotte.push_devices from public, anon, authenticated;

-- Substitui o gatilho de 30/10 (push_token_takeover) e passa a registrar o aparelho.
create or replace function charlotte.push_token_takeover() returns trigger language plpgsql security definer set search_path = charlotte, public as $$
begin
  if new.expo_push_token like 'ExponentPushToken[%' then
    -- O token passou para esta conta: sai das outras.
    if new.expo_push_token is distinct from old.expo_push_token then
      update charlotte.users set expo_push_token = null where expo_push_token = new.expo_push_token and id <> new.id;
    end if;
    insert into charlotte.push_devices (token, user_id, platform, last_seen_at)
    values (new.expo_push_token, new.id, new.app_platform, now())
    on conflict (token) do update set user_id = excluded.user_id, platform = coalesce(excluded.platform, charlotte.push_devices.platform), last_seen_at = now();
  elsif old.expo_push_token is not null and new.expo_push_token is null then
    -- Token apagado (aparelho morto ou levado por outra conta): sai da lista desta conta.
    delete from charlotte.push_devices where token = old.expo_push_token and user_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function charlotte.push_token_takeover() from public, anon, authenticated;
drop trigger if exists trg_push_token_takeover on charlotte.users;
create trigger trg_push_token_takeover after update of expo_push_token on charlotte.users for each row execute function charlotte.push_token_takeover();

-- Aparelhos que já existem: o token atual de cada conta.
insert into charlotte.push_devices (token, user_id, platform, last_seen_at)
select u.expo_push_token, u.id, u.app_platform, coalesce(u.updated_at, now())
from charlotte.users u
where u.expo_push_token like 'ExponentPushToken[%'
on conflict (token) do nothing;

-- Para o envio: dado o token principal de cada aluno, os OUTROS aparelhos da mesma conta vistos nos
-- últimos 60 dias (aparelho parado há mais tempo provavelmente foi trocado). Só a chave do servidor executa.
create or replace function public.push_extra_devices(p_tokens text[])
returns table (primary_token text, token text)
language sql stable security definer set search_path = charlotte, public, pg_temp as $$
  select p.token, d.token
  from charlotte.push_devices p
  join charlotte.push_devices d on d.user_id = p.user_id and d.token <> p.token
  where p.token = any(p_tokens)
    and d.last_seen_at > now() - interval '60 days'
$$;
revoke execute on function public.push_extra_devices(text[]) from public, anon, authenticated;
grant execute on function public.push_extra_devices(text[]) to service_role;

-- Aparelho extra que o Expo diz não existir mais (DeviceNotRegistered).
create or replace function public.push_forget_devices(p_tokens text[])
returns int language sql security definer set search_path = charlotte, public, pg_temp as $$
  with d as (delete from charlotte.push_devices where token = any(p_tokens) returning 1) select count(*)::int from d
$$;
revoke execute on function public.push_forget_devices(text[]) from public, anon, authenticated;
grant execute on function public.push_forget_devices(text[]) to service_role;
