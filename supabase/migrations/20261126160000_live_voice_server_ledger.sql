-- Segurança: minutos de Live Voice (ligação com a Charlotte e com a Família) contados só no servidor.
-- Antes o app gravava live_voice_seconds_used / live_voice_bonus_seconds e podia avançar live_voice_reset_date
-- (até amanhã) zerando o uso: dava para "virar o mês" todo dia.
--
-- 1) Guarda da conta: do app (authenticated/anon), os três campos de Live Voice não mudam mais (ignorado em
--    silêncio, como a assinatura: versões antigas ainda tentam gravar e não podem dar erro na tela). Só o servidor.
-- 2) live_voice_sessions: cada token de ligação emitido (/api/realtime-token, /api/family-call/session) abre uma
--    sessão com o teto de segundos permitido. O app avisa o fim (/api/live-voice/usage); o servidor cobra
--    min(tempo corrido, teto). O valor do app só baixa a conta, e no máximo 20 s (toque e conexão).
--    Sessão que o app nunca fechou (versão antiga, app fechado) é cobrada pelo tempo corrido até o teto
--    antes da próxima ligação.
-- 3) Cobrança: primeiro o pool do mês, depois o bônus. A virada do mês é feita aqui, no fuso do aluno
--    (padrão: Brasília). Degustação (sem assinatura) não renova.
--    Sessão aberta num mês anterior (cobrada só no mês seguinte, ou ligação que passou da meia-noite da virada)
--    é cobrada no mês em que começou: do que sobrou daquele pool e, passando dele, do bônus (como seria se
--    tivesse fechado na hora). Nunca sai do pool novo do mês.
-- Pools iguais ao app (apps/mobile/lib/liveVoiceUsage.ts): Premium/institucional 1 200 s, degustação 180 s, resto 300 s.
begin;

-- 1) Guarda da conta (recriada inteira: mantém tudo da onda 1 e 2, só fecha os campos de Live Voice).
create or replace function charlotte.guard_user_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.is_institutional is distinct from old.is_institutional
     or new.is_admin is distinct from old.is_admin
     or new.beta_features is distinct from old.beta_features
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.hide_from_ranking is distinct from old.hide_from_ranking
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at
     or new.signup_welcome_sent_at is distinct from old.signup_welcome_sent_at
     or new.trial_welcome_sent_at is distinct from old.trial_welcome_sent_at
     or coalesce(new.live_voice_bonus_seconds, 0) > coalesce(old.live_voice_bonus_seconds, 0) then
    raise exception 'campo protegido da conta';
  end if;

  new.subscription_status     := old.subscription_status;
  new.subscription_product    := old.subscription_product;
  new.subscription_expires_at := old.subscription_expires_at;
  new.is_active               := old.is_active;

  -- Live Voice: só o servidor (service role) muda uso, bônus e data da virada.
  new.live_voice_seconds_used  := old.live_voice_seconds_used;
  new.live_voice_bonus_seconds := old.live_voice_bonus_seconds;
  new.live_voice_reset_date    := old.live_voice_reset_date;
  return new;
end $$;
drop trigger if exists trg_guard_user_update on charlotte.users;
create trigger trg_guard_user_update before update on charlotte.users for each row execute function charlotte.guard_user_update();

-- 2) Sessões de ligação (só o servidor lê e grava).
create table if not exists public.live_voice_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references charlotte.users(id) on delete cascade,
  kind             text not null check (kind in ('charlotte', 'family')),
  started_at       timestamptz not null default now(),
  max_seconds      integer not null check (max_seconds >= 0),
  closed_at        timestamptz,
  close_reason     text,             -- reported (o app avisou) | unclosed (cobrada na próxima ligação) | failed (token não saiu)
  reported_seconds integer,
  charged_seconds  integer
);
create index if not exists live_voice_sessions_open on public.live_voice_sessions (user_id) where closed_at is null;
create index if not exists live_voice_sessions_user_started on public.live_voice_sessions (user_id, started_at desc);
alter table public.live_voice_sessions enable row level security;
revoke all on public.live_voice_sessions from anon, authenticated;
grant all on public.live_voice_sessions to service_role;

-- Início do mês no fuso do aluno (fuso inválido ou vazio: Brasília), no instante p_at (padrão: agora).
drop function if exists charlotte.live_voice_month_start(text);
create or replace function charlotte.live_voice_month_start(p_tz text, p_at timestamptz default now()) returns date
language sql stable set search_path = public, pg_temp as $$
  select (date_trunc('month', p_at at time zone
    case when nullif(p_tz, '') is not null and exists (select 1 from pg_timezone_names where name = p_tz)
         then p_tz else 'America/Sao_Paulo' end))::date;
$$;

-- Pool do mês pela assinatura (igual a getPoolForSubscription do app).
create or replace function charlotte.live_voice_pool(p_status text, p_institutional boolean) returns integer
language sql immutable as $$
  select case
    when coalesce(p_institutional, false) or p_status = 'active' then 1200
    when p_status is null or p_status = 'none' then 180
    else 300 end;
$$;

-- Saldo atual (sem gravar): a virada do mês entra no cálculo.
create or replace function public.live_voice_status(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u record; v_taster boolean; v_month date; v_used integer; v_pool integer; v_bonus integer; v_reset date;
begin
  select subscription_status, is_institutional, timezone, live_voice_seconds_used, live_voice_reset_date, live_voice_bonus_seconds
    into u from charlotte.users where id = p_user;
  if not found then return null; end if;
  v_taster := not coalesce(u.is_institutional, false) and (u.subscription_status is null or u.subscription_status = 'none');
  v_month  := charlotte.live_voice_month_start(u.timezone);
  v_used   := coalesce(u.live_voice_seconds_used, 0);
  v_reset  := u.live_voice_reset_date;
  if not v_taster and (v_reset is null or v_reset < v_month) then
    v_used := 0; v_reset := v_month;
  end if;
  v_pool  := charlotte.live_voice_pool(u.subscription_status, u.is_institutional);
  v_bonus := greatest(0, coalesce(u.live_voice_bonus_seconds, 0));
  return jsonb_build_object(
    'secondsUsed', v_used, 'poolTotal', v_pool, 'bonusSeconds', v_bonus,
    'secondsRemaining', greatest(0, v_pool - v_used) + v_bonus,
    'resetDate', coalesce(v_reset::text, to_char(v_month, 'YYYY-MM-DD')), 'taster', v_taster);
end $$;

-- Desconta segundos (pool do mês primeiro, depois o bônus), com a virada do mês. p_seconds = 0 só faz a virada.
-- p_started = início da sessão cobrada. Se for de um mês anterior ao atual, cobra no mês da sessão (o que sobrou
-- daquele pool, depois o bônus) antes da virada, e o pool do mês atual fica intacto. Degustação: um pool só, sem mês.
drop function if exists charlotte.live_voice_debit(uuid, integer);
create or replace function charlotte.live_voice_debit(p_user uuid, p_seconds integer, p_started timestamptz default null) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  u record; v_taster boolean; v_month date; v_used integer; v_reset date; v_pool integer; v_bonus integer;
  v_secs integer := greatest(0, coalesce(p_seconds, 0)); v_from_month integer; v_sess_month date;
begin
  select subscription_status, is_institutional, timezone, live_voice_seconds_used, live_voice_reset_date, live_voice_bonus_seconds
    into u from charlotte.users where id = p_user for update;
  if not found then return; end if;
  v_taster := not coalesce(u.is_institutional, false) and (u.subscription_status is null or u.subscription_status = 'none');
  v_month  := charlotte.live_voice_month_start(u.timezone);
  v_used   := coalesce(u.live_voice_seconds_used, 0);
  v_reset  := u.live_voice_reset_date;
  v_pool   := charlotte.live_voice_pool(u.subscription_status, u.is_institutional);
  v_bonus  := greatest(0, coalesce(u.live_voice_bonus_seconds, 0));
  if not v_taster and p_started is not null then
    v_sess_month := charlotte.live_voice_month_start(u.timezone, p_started);
  end if;
  if v_sess_month is not null and v_sess_month < v_month then
    -- Sessão de mês anterior: cobra no mês dela (o que sobrou daquele pool, depois o bônus), antes da virada,
    -- que vem na cobrança seguinte (live_voice_start faz logo depois). Conta já num mês posterior ao da sessão:
    -- o uso daquele mês não está mais gravado e conta como zero; o uso do mês atual não muda.
    if v_reset is null or v_reset < v_sess_month then
      v_used := 0; v_reset := v_sess_month;
    end if;
    if v_reset = v_sess_month then
      v_from_month := least(v_secs, greatest(0, v_pool - v_used));
      v_used := v_used + v_from_month;
    else
      v_from_month := least(v_secs, v_pool);
    end if;
    update charlotte.users set
      live_voice_seconds_used  = v_used,
      live_voice_bonus_seconds = greatest(0, v_bonus - (v_secs - v_from_month)),
      live_voice_reset_date    = v_reset
    where id = p_user;
    return;
  end if;
  if not v_taster and (v_reset is null or v_reset < v_month) then
    v_used := 0; v_reset := v_month;
  end if;
  v_from_month := least(v_secs, greatest(0, v_pool - v_used));
  if v_from_month = 0 and v_secs = 0 and v_reset is not distinct from u.live_voice_reset_date then
    return;
  end if;
  update charlotte.users set
    live_voice_seconds_used  = v_used + v_from_month,
    live_voice_bonus_seconds = greatest(0, v_bonus - (v_secs - v_from_month)),
    live_voice_reset_date    = v_reset
  where id = p_user;
end $$;

-- Segundos a cobrar de uma sessão: tempo corrido até o teto. O valor do app só baixa, até 20 s.
create or replace function charlotte.live_voice_charge_of(p_started timestamptz, p_max integer, p_reported integer) returns integer
language sql stable as $$
  select least(
    greatest(0, p_max),
    e,
    greatest(coalesce(greatest(0, p_reported), e), e - 20)
  )
  from (select greatest(0, floor(extract(epoch from now() - p_started)))::integer as e) t;
$$;

-- Nova ligação: cobra sessões abertas (nunca fechadas; a de mês anterior, no mês dela), faz a virada do mês e abre a sessão com o teto
-- (saldo restante, no máximo p_cap). Sem saldo: { ok: false, error: 'monthly_pool_exhausted' }.
create or replace function public.live_voice_start(p_user uuid, p_kind text, p_cap integer default 3600) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s record; v_charge integer; v_status jsonb; v_remaining integer; v_id uuid;
begin
  perform 1 from charlotte.users where id = p_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_user'); end if;
  for s in select id, started_at, max_seconds from public.live_voice_sessions
           where user_id = p_user and closed_at is null for update loop
    v_charge := charlotte.live_voice_charge_of(s.started_at, s.max_seconds, null);
    update public.live_voice_sessions set closed_at = now(), close_reason = 'unclosed', charged_seconds = v_charge where id = s.id;
    perform charlotte.live_voice_debit(p_user, v_charge, s.started_at); -- no mês em que a sessão começou
  end loop;
  perform charlotte.live_voice_debit(p_user, 0);
  v_status := public.live_voice_status(p_user);
  v_remaining := coalesce((v_status->>'secondsRemaining')::integer, 0);
  if v_remaining <= 0 then
    return jsonb_build_object('ok', false, 'error', 'monthly_pool_exhausted', 'remaining', 0);
  end if;
  insert into public.live_voice_sessions (user_id, kind, max_seconds)
    values (p_user, p_kind, least(v_remaining, greatest(1, coalesce(p_cap, 3600))))
    returning id into v_id;
  return jsonb_build_object('ok', true, 'session', v_id, 'remaining', v_remaining);
end $$;

-- Fim da ligação avisado pelo app (p_failed = token não saiu: fecha sem cobrar). Sessão já fechada: nada muda.
create or replace function public.live_voice_close(p_user uuid, p_session uuid, p_reported integer, p_failed boolean default false) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  s record; v_charge integer;
begin
  perform 1 from charlotte.users where id = p_user for update;
  select id, started_at, max_seconds into s from public.live_voice_sessions
    where id = p_session and user_id = p_user and closed_at is null for update;
  if not found then return jsonb_build_object('closed', false, 'charged', 0); end if;
  v_charge := case when p_failed then 0 else charlotte.live_voice_charge_of(s.started_at, s.max_seconds, p_reported) end;
  update public.live_voice_sessions set
    closed_at = now(), close_reason = case when p_failed then 'failed' else 'reported' end,
    reported_seconds = p_reported, charged_seconds = v_charge
  where id = s.id;
  perform charlotte.live_voice_debit(p_user, v_charge, s.started_at);
  return jsonb_build_object('closed', true, 'charged', v_charge);
end $$;

-- Só o servidor chama.
revoke execute on function charlotte.live_voice_month_start(text, timestamptz) from public, anon, authenticated;
revoke execute on function charlotte.live_voice_pool(text, boolean) from public, anon, authenticated;
revoke execute on function charlotte.live_voice_debit(uuid, integer, timestamptz) from public, anon, authenticated;
revoke execute on function charlotte.live_voice_charge_of(timestamptz, integer, integer) from public, anon, authenticated;
revoke execute on function public.live_voice_status(uuid) from public, anon, authenticated;
revoke execute on function public.live_voice_start(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.live_voice_close(uuid, uuid, integer, boolean) from public, anon, authenticated;
grant execute on function charlotte.live_voice_month_start(text, timestamptz), charlotte.live_voice_pool(text, boolean),
  charlotte.live_voice_debit(uuid, integer, timestamptz), charlotte.live_voice_charge_of(timestamptz, integer, integer),
  public.live_voice_status(uuid), public.live_voice_start(uuid, text, integer),
  public.live_voice_close(uuid, uuid, integer, boolean) to service_role;

commit;
