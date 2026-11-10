-- Métricas e Visão geral do /admin com as contas feitas no banco.
-- Antes as duas telas baixavam todas as linhas das tabelas que crescem (alunos, 90 dias de práticas,
-- custo de IA, eventos, cobranças, chamadas de voz) e somavam no servidor. Com 1.700 alunos são umas
-- 120 mil linhas por abertura; com 100 mil alunos não cabe no tempo da rota. Agora cada função devolve
-- um único jsonb com contagens, somas e linhas já agrupadas, e o servidor só monta a resposta.
--
-- As regras são as mesmas de lib/admin-subscriptions.ts e lib/revenue-day.ts, reproduzidas ao pé da letra:
--  - instantes em ms UTC truncados (como new Date(...).getTime());
--  - dia de Brasília = floor((ms - 3 h) / 1 dia), sem horário de verão;
--  - cobrança do site gravada só com a data vale 00h de Brasília daquele dia;
--  - equipe fora (is_institutional, hide_from_ranking, @hubacademybr.com, @queizy.com, felipe.xavier1987+).
-- Valores em float8, como Number() no servidor, para os arredondamentos baterem.
-- Só a chave do servidor executa.

-- ── Base ────────────────────────────────────────────────────────────────────

-- jsonb de um texto, ou null se não for JSON válido (as propriedades dos eventos chegam como texto).
create or replace function public.admin_try_jsonb(p text)
returns jsonb language plpgsql immutable set search_path = pg_catalog, pg_temp as $$
begin
  return p::jsonb;
exception when others then
  return null;
end
$$;

-- Contas da equipe (ficam fora de todos os números de negócio).
create or replace function public.admin_team_ids()
returns table (id text)
language sql stable set search_path = public, pg_temp as $$
  select u.id::text from public.charlotte_users u
  where coalesce(u.is_institutional, false) or coalesce(u.hide_from_ranking, false)
     or u.email ~* '@(hubacademybr\.com|queizy\.com)$' or u.email ~* '^felipe\.xavier1987\+'
$$;

-- 1ª cobrança de cada conta em ms (chargeIndex): revenue_events sem REFUND, com valor e sem reembolso
-- por inteiro, e compras do site concluídas (cobradas na hora, pagas, ou no fim do teste com cobrança criada).
-- p_rev_created: sem purchased_at, vale o created_at (Visão geral); Métricas não usa o created_at.
create or replace function public.admin_first_charges(p_rev_created boolean)
returns table (uid text, first_ms bigint)
language sql stable set search_path = public, pg_temp as $$
  with r as (
    select e.app_user_id as uid, e.event_type, e.price_purchased,
      case
        when e.purchased_at is not null then floor(extract(epoch from e.purchased_at) * 1000)::bigint
          + case when e.store = 'ASAAS' and floor(extract(epoch from e.purchased_at) * 1000)::bigint % 86400000 = 0 then 10800000 else 0 end
        when p_rev_created then floor(extract(epoch from e.created_at) * 1000)::bigint
      end as at_ms
    from public.revenue_events e
  ),
  cnt as (
    select uid,
      count(*) filter (where event_type = 'REFUND') as refunds,
      count(*) filter (where event_type is distinct from 'REFUND' and price_purchased > 0) as purchases
    from r group by uid
  ),
  c as (
    select r.uid, r.at_ms from r join cnt on cnt.uid = r.uid
    where r.event_type is distinct from 'REFUND' and r.price_purchased > 0
      and not (cnt.refunds > 0 and cnt.refunds >= cnt.purchases)
    union all
    select k.user_id::text,
      case
        when k.paid_at is not null then floor(extract(epoch from k.paid_at) * 1000)::bigint
        when not (coalesce(k.trial_days, 0) > 0) then floor(extract(epoch from k.created_at) * 1000)::bigint
        when coalesce(k.asaas_payment_id, '') <> '' then floor(extract(epoch from k.created_at) * 1000)::bigint + k.trial_days::bigint * 86400000
      end
    from public.asaas_checkouts k
    where k.sandbox = false and k.status = 'paid' and k.refunded_at is null
  )
  select uid, min(at_ms) from c where at_ms is not null and uid is not null group by uid
$$;

-- Situação de cada conta fora da equipe (subscriptionKind, monthlyValueOf, firstChargeDay), com os
-- filtro de nível das Métricas (nulo = todos; o de plano fica em admin_plan_match). ord = posição na ordem por id.
create or replace function public.admin_account_facts(p_now_ms bigint, p_rev_created boolean, p_level text default null)
returns table (
  id text, ord bigint, email text, name text, created_ms bigint, created_day bigint, charlotte_level text,
  subscription_status text, subscription_product text, expires_ms bigint, placement_test_done boolean,
  app_version text, app_platform text, last_seen_ms bigint,
  taster boolean, store_product boolean, site_product boolean, annual boolean, started_trial_ever boolean,
  paid_ever boolean, first_charge_ms bigint, kind text, paid_kind boolean, trial_kind boolean,
  has_ck boolean, ck_trial_days int, monthly_value float8, first_charge_day bigint
)
language sql stable set search_path = public, pg_temp as $$
  with ch as (select * from public.admin_first_charges(p_rev_created)),
  ck as (
    select distinct on (k.user_id) k.user_id::text as uid, k.value_brl, k.trial_days,
      floor(extract(epoch from k.created_at) * 1000)::bigint as created_ms
    from public.asaas_checkouts k
    where k.sandbox = false and k.status = 'paid' and k.refunded_at is null
    order by k.user_id, k.created_at desc, k.id desc
  ),
  team as (select * from public.admin_team_ids()),
  u as (
    select u.id::text as id, row_number() over (order by u.id) as ord, u.email, u.name,
      floor(extract(epoch from u.created_at) * 1000)::bigint as created_ms,
      u.charlotte_level, u.subscription_status, u.subscription_product,
      floor(extract(epoch from u.subscription_expires_at) * 1000)::bigint as expires_ms,
      floor(extract(epoch from u.trial_ends_at) * 1000)::bigint as trial_ends_ms,
      u.placement_test_done, u.app_version, u.app_platform,
      floor(extract(epoch from u.last_seen_at) * 1000)::bigint as last_seen_ms,
      (u.subscription_status is null or u.subscription_status = 'none') as taster,
      coalesce(u.subscription_product in ('monthly', 'yearly'), false) as store_product,
      coalesce(left(u.subscription_product, 4) = 'web_' and u.subscription_product <> '', false) as site_product,
      coalesce(u.subscription_product = 'yearly' or left(u.subscription_product, 10) = 'web_annual', false) as annual
    from public.charlotte_users u
    where not exists (select 1 from team t where t.id = u.id::text)
  ),
  k as (
    select u.*, ch.first_ms as first_charge_ms, ch.first_ms is not null as paid_ever,
      case
        when u.subscription_status = 'trial' then case when u.trial_ends_ms > p_now_ms then 'trial_legacy' end
        when u.subscription_status is null or u.subscription_status not in ('active', 'cancelled') then null
        when u.expires_ms is null or u.expires_ms <= p_now_ms then null
        when u.store_product then case when ch.first_ms is not null then 'paid_store' else 'trial_store' end
        when u.site_product then case when ch.first_ms is not null then 'paid_site' else 'trial_site' end
      end as kind,
      ck.uid is not null as has_ck, ck.trial_days as ck_trial_days, ck.value_brl as ck_value, ck.created_ms as ck_created_ms
    from u
    left join ch on ch.uid = u.id
    left join ck on ck.uid = u.id
  )
  select k.id, k.ord, k.email, k.name, k.created_ms, (k.created_ms - 10800000) / 86400000, k.charlotte_level,
    k.subscription_status, k.subscription_product, k.expires_ms, k.placement_test_done,
    k.app_version, k.app_platform, k.last_seen_ms,
    k.taster, k.store_product, k.site_product, k.annual,
    (k.store_product or k.site_product or coalesce(k.subscription_status = 'trial', false)),
    k.paid_ever, k.first_charge_ms, k.kind,
    coalesce(k.kind in ('paid_store', 'paid_site'), false),
    coalesce(k.kind in ('trial_store', 'trial_site', 'trial_legacy'), false),
    k.has_ck, k.ck_trial_days,
    case
      when k.site_product and k.has_ck then coalesce(k.ck_value::float8, 0) / case when k.annual then 12 else 1 end
      when k.annual then 199.99::float8 / 12
      else 29.99::float8
    end,
    case
      when k.site_product and k.has_ck and coalesce(k.ck_trial_days, 0) > 0 then (k.ck_created_ms + k.ck_trial_days::bigint * 86400000) / 86400000
      when k.expires_ms is not null then (k.expires_ms - 10800000) / 86400000
    end
  from k
  where p_level is null or k.charlotte_level = p_level
$$;

-- Filtro de plano das Métricas (taste | trial | paid | monthly | annual; outro valor não filtra contas).
create or replace function public.admin_plan_match(p_plan text, p_taster boolean, p_kind text, p_annual boolean)
returns boolean language sql immutable set search_path = pg_catalog, pg_temp as $$
  select case
    when p_plan is null then true
    when p_plan = 'taste' then p_taster
    when p_plan = 'trial' then coalesce(p_kind in ('trial_store', 'trial_site', 'trial_legacy'), false)
    when p_plan = 'paid' then coalesce(p_kind in ('paid_store', 'paid_site'), false)
    when p_plan in ('monthly', 'annual') then p_kind is not null and p_kind <> 'trial_legacy' and p_annual = (p_plan = 'annual')
    else true
  end
$$;

-- ── Métricas: contas, receita, degustação, origem e checkout do site ──────────
-- p_from_ms/p_to_ms: período; p_days: tamanho (o período anterior tem o mesmo tamanho).
create or replace function public.admin_metrics_accounts(p_from_ms bigint, p_to_ms bigint, p_now_ms bigint, p_days int, p_level text, p_plan text, p_taste_days int)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with prm as (
    select (p_now_ms - 10800000) / 86400000 as today,
      p_from_ms - p_days::bigint * 86400000 as prev_from_ms, p_from_ms - 1 as prev_to_ms,
      (p_level is not null or p_plan is not null) as has_filter,
      'epoch'::timestamptz + (p_from_ms || ' milliseconds')::interval as from_ts,
      'epoch'::timestamptz + (p_to_ms || ' milliseconds')::interval as to_ts
  ),
  s as materialized (
    select f.*,
      f.paid_kind and f.subscription_status = 'active' as active_sub,
      coalesce(f.kind in ('trial_store', 'trial_site'), false) and f.subscription_status = 'active' as trial_active,
      (f.subscription_status in ('cancelled', 'expired') and f.paid_ever) is true as lost_access,
      (f.store_product or (f.site_product and (not f.has_ck or coalesce(f.ck_trial_days, 0) > 0))) as had_card_trial
    from public.admin_account_facts(p_now_ms, false, p_level) f
    where public.admin_plan_match(p_plan, f.taster, f.kind, f.annual)
  ),
  team as materialized (select * from public.admin_team_ids()),
  ch as materialized (select * from public.admin_first_charges(false)),
  -- Revenue_events do escopo (com filtro, só das contas filtradas).
  rv as (
    select e.event_type, e.store, e.price_purchased, e.gross_brl, e.net_brl,
      case when e.purchased_at is not null then floor(extract(epoch from e.purchased_at) * 1000)::bigint
        + case when e.store = 'ASAAS' and floor(extract(epoch from e.purchased_at) * 1000)::bigint % 86400000 = 0 then 10800000 else 0 end
      end as at_ms
    from public.revenue_events e, prm
    where ((prm.has_filter and e.app_user_id in (select s.id from s))
               or (not prm.has_filter and (e.app_user_id is null or e.app_user_id not in (select t.id from team t))))
  ),
  cash as (
    select
      coalesce(sum(coalesce(gross_brl, price_purchased, 0)::float8) filter (where c), 0) as gross,
      coalesce(sum(coalesce(net_brl, 0)::float8) filter (where c), 0) as net,
      count(*) filter (where c) as charges,
      count(*) filter (where c and store is distinct from 'ASAAS') as store_charges,
      count(*) filter (where c and store = 'ASAAS') as site_charges,
      coalesce(sum(coalesce(net_brl, 0)::float8) filter (where rf), 0) as refunds_brl,
      count(*) filter (where rf) as refunds
    from (
      select rv.*,
        (rv.event_type is distinct from 'REFUND' and rv.price_purchased > 0 and rv.at_ms between p_from_ms and p_to_ms) is true as c,
        (rv.event_type = 'REFUND' and rv.at_ms between p_from_ms and p_to_ms) is true as rf
      from rv
    ) x
  ),
  -- Checkouts do site criados no período (ckInRange), com a plataforma da conta e se já houve cobrança.
  ckr as materialized (
    select k.user_id::text as uid, k.status, coalesce(k.trial_days, 0) > 0 as has_trial,
      k.channel, k.affiliate_code, k.coupon_code,
      row_number() over (order by k.created_at, k.id) as ord,
      case when s.app_platform in ('ios', 'android') then s.app_platform else 'web' end as plat,
      (k.refunded_at is null and (k.paid_at is not null or (k.status = 'paid' and not (coalesce(k.trial_days, 0) > 0))
        or k.user_id::text in (select ch.uid from ch))) as charged
    from public.asaas_checkouts k
    cross join prm
    left join s on s.id = k.user_id::text
    where k.sandbox = false
      and floor(extract(epoch from k.created_at) * 1000)::bigint between p_from_ms and p_to_ms
      and ((prm.has_filter and s.id is not null)
        or (not prm.has_filter and (k.user_id is null or k.user_id::text not in (select t.id from team t))))
  ),
  ck_group as (
    select g.dim, g.key, min(g.ord) as ord,
      count(distinct g.uid) as checkouts,
      count(distinct g.uid) filter (where g.status = 'paid') as completed,
      count(distinct g.uid) filter (where g.charged) as paid
    from (
      select 'channel' as dim, coalesce(channel, 'sem canal') as key, uid, status, charged, ord from ckr
      union all select 'affiliate', affiliate_code, uid, status, charged, ord from ckr
      union all select 'coupon', coupon_code, uid, status, charged, ord from ckr
    ) g
    where coalesce(g.key, '') <> ''
    group by g.dim, g.key
  ),
  site_funnel as (
    select pl.plat,
      count(distinct ckr.uid) as checkouts,
      count(distinct ckr.uid) filter (where ckr.status = 'paid' and ckr.has_trial) as started,
      count(distinct ckr.uid) filter (where ckr.status = 'paid' and not ckr.has_trial) as direct,
      count(distinct ckr.uid) filter (where ckr.charged) as paid
    from (values (1, 'ios'), (2, 'android'), (3, 'web')) as pl(i, plat)
    left join ckr on ckr.plat = pl.plat
    group by pl.i, pl.plat
  ),
  -- Origem das contas: respostas de quem está no escopo.
  acq as materialized (
    select s.created_ms, s.started_trial_ever, s.paid_ever, a.source,
      floor(extract(epoch from a.created_at) * 1000)::bigint as answered_ms,
      row_number() over (order by a.user_id) as ord,
      case when a.source in ('influencer', 'meta_ads', 'store_search', 'friend', 'other') then a.source
           when a.source = 'skipped' or coalesce(a.source, '') = '' then 'skipped' else 'other' end as key
    from public.acquisition_answers a join s on s.id = a.user_id::text
  ),
  acq_since as (select min(answered_ms) as since from acq),
  acq_source as (
    select key, min(ord) as ord, count(*) as accounts,
      count(*) filter (where started_trial_ever) as trial, count(*) filter (where paid_ever) as paid
    from acq group by key
  ),
  -- Versão do app: quem abriu nos últimos 30 dias, por plataforma e versão.
  app_ver as (
    select app_platform, app_version, count(*) as n, min(ord) as ord
    from s where last_seen_ms >= p_now_ms - 30::bigint * 86400000
    group by app_platform, app_version
  ),
  mrr_week as (
    select wk, sum(monthly_value) as amount
    from (select ((first_charge_ms - 10800000) / 86400000) - (((first_charge_ms - 10800000) / 86400000 + 3) % 7) as wk, monthly_value
          from s where first_charge_ms is not null) w, prm
    where wk between (prm.today - ((prm.today + 3) % 7)) - 77 and prm.today - ((prm.today + 3) % 7)
    group by wk
  ),
  u as (
    select
      count(*) as total,
      count(*) filter (where active_sub and kind = 'paid_store') as paid_store,
      count(*) filter (where active_sub and kind = 'paid_site') as paid_site,
      count(*) filter (where trial_active and kind = 'trial_store') as trial_store,
      count(*) filter (where trial_active and kind = 'trial_site') as trial_site,
      count(*) filter (where kind = 'trial_legacy') as trial_legacy,
      count(*) filter (where subscription_status = 'cancelled' and kind is not null) as cancelled_with_access,
      count(*) filter (where subscription_status = 'cancelled' and kind is not null and paid_kind) as cancelled_paid,
      count(*) filter (where subscription_status = 'cancelled' and kind is not null and not paid_kind) as cancelled_trial,
      count(*) filter (where active_sub) as active_subs,
      count(*) filter (where active_sub and not annual) as monthly_subs,
      count(*) filter (where active_sub and annual) as yearly_subs,
      coalesce(sum(monthly_value) filter (where active_sub), 0) as mrr,
      coalesce(sum(monthly_value) filter (where trial_active), 0) as trial_mrr,
      count(*) filter (where had_card_trial and paid_ever) as converted,
      count(*) filter (where had_card_trial and not paid_ever and kind is null and subscription_status in ('cancelled', 'expired')) as ended_unpaid,
      count(*) filter (where pas) as paying_at_start,
      count(*) filter (where pas and lost_access and expires_ms between p_from_ms and p_to_ms) as churned_from_start,
      count(*) filter (where trial_active and first_charge_day between ((p_now_ms - 10800000) / 86400000) and ((p_now_ms - 10800000) / 86400000) + 6) as first_charges_7d,
      count(*) filter (where active_sub and first_charge_day between ((p_now_ms - 10800000) / 86400000) and ((p_now_ms - 10800000) / 86400000) + 6) as renewal_charges_7d,
      count(*) filter (where taster) as taste_total,
      count(*) filter (where taster and ((p_now_ms - 10800000) / 86400000) - created_day + 1 = 1) as taste_day1,
      count(*) filter (where taster and ((p_now_ms - 10800000) / 86400000) - created_day + 1 = p_taste_days) as taste_last_day,
      count(*) filter (where taster and ((p_now_ms - 10800000) / 86400000) - created_day + 1 <= p_taste_days) as taste_in_progress,
      count(*) filter (where taster and ((p_now_ms - 10800000) / 86400000) - created_day + 1 > p_taste_days) as taste_exhausted,
      count(*) filter (where created_ms between p_from_ms and p_to_ms) as signups,
      count(*) filter (where created_ms between p_from_ms and p_to_ms and placement_test_done is true) as placement_done,
      count(*) filter (where created_ms between p_from_ms and p_to_ms and paid_ever) as paid_in_cohort,
      count(*) filter (where created_ms between p_from_ms and p_to_ms and app_platform = 'ios') as signups_ios,
      count(*) filter (where created_ms between p_from_ms and p_to_ms and app_platform = 'android') as signups_android,
      count(*) filter (where created_ms between (p_from_ms - p_days::bigint * 86400000) and (p_from_ms - 1)) as prev_signups,
      count(*) filter (where first_charge_ms between p_from_ms and p_to_ms) as new_count,
      count(*) filter (where first_charge_ms between p_from_ms and p_to_ms and not annual) as new_monthly,
      count(*) filter (where first_charge_ms between p_from_ms and p_to_ms and annual) as new_yearly,
      coalesce(sum(monthly_value) filter (where first_charge_ms between p_from_ms and p_to_ms), 0) as new_mrr,
      count(*) filter (where lost_access and expires_ms between p_from_ms and p_to_ms) as churned_count,
      count(*) filter (where lost_access and expires_ms between p_from_ms and p_to_ms and not annual) as churned_monthly,
      count(*) filter (where lost_access and expires_ms between p_from_ms and p_to_ms and annual) as churned_yearly,
      coalesce(sum(monthly_value) filter (where lost_access and expires_ms between p_from_ms and p_to_ms), 0) as churned_mrr,
      (select since from acq_since) as acq_since
    from (
      select s.*,
        (s.first_charge_ms < p_from_ms and case when s.expires_ms is not null then s.expires_ms >= p_from_ms else s.subscription_status = 'active' end) is true as pas
      from s
    ) s2
  )
  select jsonb_build_object(
    'users', (select to_jsonb(u) from u),
    'acqBase', (select count(*) from s, acq_since where acq_since.since is not null and s.created_ms >= acq_since.since),
    'acqAnswered', (select count(*) from acq where coalesce(source, '') <> '' and source <> 'skipped'),
    'acqTotal', (select count(*) from acq),
    'bySource', (select coalesce(jsonb_agg(to_jsonb(a) order by a.ord), '[]'::jsonb) from acq_source a),
    'cash', (select to_jsonb(cash) from cash),
    'ckGroups', (select coalesce(jsonb_agg(to_jsonb(g) order by g.ord), '[]'::jsonb) from ck_group g),
    'siteFunnel', (select coalesce(jsonb_agg(jsonb_build_object('platform', plat, 'checkouts', checkouts, 'started', started, 'direct', direct, 'paid', paid)), '[]'::jsonb) from site_funnel),
    'appVersions', (select coalesce(jsonb_agg(to_jsonb(v) order by v.ord), '[]'::jsonb) from app_ver v),
    'mrrWeeks', (select coalesce(jsonb_agg(jsonb_build_object('wk', wk, 'amount', amount)), '[]'::jsonb) from mrr_week)
  )
$$;

-- ── Métricas: atividades (ativos por dia, retenção, funil, coortes, horários, sequência) ──
create or replace function public.admin_metrics_activity(p_from_ms bigint, p_to_ms bigint, p_now_ms bigint, p_days int, p_level text, p_plan text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with prm as (
    select (p_now_ms - 10800000) / 86400000 as today,
      p_from_ms - p_days::bigint * 86400000 as prev_from_ms, p_from_ms - 1 as prev_to_ms,
      (p_level is not null or p_plan is not null) as has_filter,
      'epoch'::timestamptz + (least(p_from_ms - p_days::bigint * 86400000, ((p_now_ms - 10800000) / 86400000 - 89) * 86400000 + 10800000) || ' milliseconds')::interval as wide_ts,
      'epoch'::timestamptz + (p_to_ms || ' milliseconds')::interval as to_ts
  ),
  s as materialized (
    select f.*, f.paid_kind and f.subscription_status = 'active' as active_sub
    from public.admin_account_facts(p_now_ms, false, p_level) f
    where public.admin_plan_match(p_plan, f.taster, f.kind, f.annual)
  ),
  team as materialized (select * from public.admin_team_ids()),
  -- Atividades (sem resgates de recompensa) desde o início da janela larga até o fim do período.
  p as materialized (
    select coalesce(x.user_id::text, 'null') as uid, floor(extract(epoch from x.created_at) * 1000)::bigint as t
    from public.charlotte_practices x, prm
    where not (x.practice_type like '%reward%')
      and x.created_at >= prm.wide_ts and x.created_at <= prm.to_ts
      and ((prm.has_filter and x.user_id::text in (select s.id from s))
               or (not prm.has_filter and (x.user_id is null or x.user_id::text not in (select t.id from team t))))
  ),
  pd as materialized (select distinct uid, (t - 10800000) / 86400000 as d from p),
  pu as materialized (select uid, count(*) as n, min(t) as min_t, max(t) as max_t from p group by uid),
  day_counts as (select d, count(*) as n from pd group by d),
  cohort as materialized (select s.* from s where s.created_ms between p_from_ms and p_to_ms),
  tt as (
    select h, h_ms, row_number() over (order by h) - 1 as i, count(*) over () as n
    from (select pu.min_t - c.created_ms as h_ms, (pu.min_t - c.created_ms)::float8 / 3600000 as h from cohort c join pu on pu.uid = c.id) z
    where h >= 0
  ),
  weeks as (
    select w, (prm.today - ((prm.today + 3) % 7)) - w * 7 as start_idx from generate_series(0, 7) w, prm
  ),
  wk_cohort as (
    select wk.w, wk.start_idx, s.id, s.created_ms
    from weeks wk join s on s.created_ms between wk.start_idx * 86400000 + 10800000 and (wk.start_idx + 7) * 86400000 + 10800000 - 1
  ),
  -- Semanas de conta (0, 1, 2...) em que cada aluno da coorte teve atividade.
  wk_active as materialized (
    select distinct c.id, (p.t - c.created_ms) / (7 * 86400000::bigint) as k
    from wk_cohort c join p on p.uid = c.id and p.t >= c.created_ms
  ),
  wk_surv as (
    select c.w, n.n,
      count(*) filter (where p_now_ms - c.created_ms >= (n.n + 1) * 7 * 86400000::bigint) as eligible,
      count(*) filter (where p_now_ms - c.created_ms >= (n.n + 1) * 7 * 86400000::bigint and (c.id, n.n::bigint) in (select a.id, a.k from wk_active a)) as kept
    from wk_cohort c cross join (values (1), (2), (3), (4), (6), (8)) as n(n)
    group by c.w, n.n
  ),
  ret as (
    select x.x,
      count(*) filter (where prm.today >= s.created_day + x.x + 1) as eligible,
      count(*) filter (where prm.today >= s.created_day + x.x + 1 and (s.id, s.created_day + x.x) in (select pd.uid, pd.d from pd)) as retained
    from s cross join (values (1), (7), (30)) as x(x) cross join prm
    where s.created_ms >= p_now_ms - 60 * 86400000::bigint
    group by x.x
  ),
  heat as (
    select (((t - 10800000) / 86400000) + 4) % 7 as dow, ((t - 10800000) % 86400000) / 3600000 as hour, count(*) as n
    from p where t between p_from_ms and p_to_ms group by 1, 2
  ),
  mau_set as (select distinct pd.uid from pd, prm where pd.d between prm.today - 29 and prm.today),
  streak as (
    select case when st = 0 then '0' when st <= 3 then '1-3' when st <= 7 then '4-7' when st <= 14 then '8-14' when st <= 30 then '15-30' else '30+' end as bucket,
      count(*) as n
    from (
      select case when g.last_practice_date >= date '1970-01-01' + (prm.today - 1)::int then coalesce(g.streak_days, 0) else 0 end as st
      from public.charlotte_progress g cross join prm
      where ((prm.has_filter and g.user_id::text in (select s.id from s))
                 or (not prm.has_filter and (g.user_id is null or g.user_id::text not in (select t.id from team t))))
        and exists (select 1 from mau_set m where m.uid = g.user_id::text)
    ) z group by 1
  )
  select jsonb_build_object(
    'days', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n)), '[]'::jsonb) from day_counts),
    'wau', (select count(distinct uid) from pd, prm where d between prm.today - 6 and prm.today),
    'mau', (select count(*) from mau_set),
    'prevMau', (select count(distinct uid) from pd, prm where d between prm.today - 59 and prm.today - 30),
    'mauComplete', (select count(distinct uid) from pd, prm where d between prm.today - 30 and prm.today - 1),
    'activeInRange', (select count(distinct uid) from p where t between p_from_ms and p_to_ms),
    'prevActiveInRange', (select count(distinct uid) from p, prm where t between prm.prev_from_ms and prm.prev_to_ms),
    'inactivePaying', (select count(*) from s left join pu on pu.uid = s.id where s.active_sub and not coalesce(pu.max_t >= p_now_ms - 14 * 86400000::bigint, false)),
    'retention', (select coalesce(jsonb_agg(jsonb_build_object('x', x, 'eligible', eligible, 'retained', retained)), '[]'::jsonb) from ret),
    'funnel', (select jsonb_build_object(
        'signups', count(*),
        'first', count(*) filter (where coalesce(pu.n, 0) >= 1),
        'three', count(*) filter (where coalesce(pu.n, 0) >= 3),
        'retained30Base', count(*) filter (where p_now_ms - c.created_ms >= 30 * 86400000::bigint),
        'retained30', count(*) filter (where p_now_ms - c.created_ms >= 30 * 86400000::bigint
          and pu.max_t - c.created_ms >= 30 * 86400000::bigint))
      from cohort c left join pu on pu.uid = c.id),
    'ttfv', (select jsonb_build_object(
        'n', count(*),
        -- Em ms inteiros: o jsonb guardaria só 15 dígitos de um float8 (a hora sai no servidor).
        'medianMs', min(h_ms) filter (where i = least(n - 1, floor(n::float8 * 0.5::float8))),
        'p90Ms', min(h_ms) filter (where i = least(n - 1, floor(n::float8 * 0.9::float8))),
        'b1', count(*) filter (where h < 1), 'b24', count(*) filter (where h >= 1 and h < 24),
        'b72', count(*) filter (where h >= 24 and h < 72), 'b168', count(*) filter (where h >= 72 and h < 168),
        'b720', count(*) filter (where h >= 168 and h < 720), 'bInf', count(*) filter (where h >= 720))
      from tt),
    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object('w', wk.w, 'start', wk.start_idx,
        'size', (select count(*) from wk_cohort c where c.w = wk.w),
        'surv', (select coalesce(jsonb_object_agg(v.n::text, jsonb_build_object('e', v.eligible, 'k', v.kept)), '{}'::jsonb) from wk_surv v where v.w = wk.w))), '[]'::jsonb) from weeks wk),
    'heatmap', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'n', n)), '[]'::jsonb) from heat),
    'streak', (select coalesce(jsonb_object_agg(bucket, n), '{}'::jsonb) from streak)
  )
$$;

-- ── Métricas: custo de IA (período e período anterior) ───────────────────────
create or replace function public.admin_metrics_ai_cost(p_from_ms bigint, p_to_ms bigint, p_now_ms bigint, p_days int, p_level text, p_plan text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with prm as (
    select p_from_ms - p_days::bigint * 86400000 as prev_from_ms, p_from_ms - 1 as prev_to_ms,
      (p_level is not null or p_plan is not null) as has_filter,
      'epoch'::timestamptz + ((p_from_ms - p_days::bigint * 86400000) || ' milliseconds')::interval as prev_from_ts,
      'epoch'::timestamptz + (p_to_ms || ' milliseconds')::interval as to_ts
  ),
  s as materialized (
    select f.* from public.admin_account_facts(p_now_ms, false, p_level) f
    where public.admin_plan_match(p_plan, f.taster, f.kind, f.annual)
  ),
  team as materialized (select * from public.admin_team_ids()),
  r as materialized (
    select x.id, x.user_id, x.endpoint, x.model, coalesce(x.cost_usd::float8, 0) as cost, coalesce(x.total_tokens, 0) as tokens,
      floor(extract(epoch from x.created_at) * 1000)::bigint as t,
      not (left(x.endpoint, 5) = '/api/') or left(x.endpoint, 10) = '/api/admin' as internal
    from public.openai_usage x, prm
    where x.created_at >= prm.prev_from_ts and x.created_at <= prm.to_ts
      and ((prm.has_filter and x.user_id in (select s.id from s))
               or (not prm.has_filter and (x.user_id is null or x.user_id not in (select t.id from team t))))
  ),
  cur as materialized (select * from r where t between p_from_ms and p_to_ms),
  prev as (select r.* from r, prm where t between prm.prev_from_ms and prm.prev_to_ms),
  by_user as (
    select coalesce(user_id, 'anonymous') as uid, sum(cost) as cost, min(id) as ord
    from cur group by 1
  ),
  top_users as (
    select b.uid, b.cost, b.ord, s.email, s.name from (
      select * from by_user where uid <> 'anonymous' and left(uid, 7) <> 'system:' order by cost desc, ord limit 50
    ) b left join s on s.id = b.uid
  )
  select jsonb_build_object(
    'totalCost', (select coalesce(sum(cost), 0) from cur),
    'callCount', (select count(*) from cur),
    'studentCost', (select coalesce(sum(cost), 0) from cur where not internal),
    'prevCost', (select coalesce(sum(cost), 0) from prev),
    'prevStudentCost', (select coalesce(sum(cost), 0) from prev where not internal),
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'model', model, 'cost', cost, 'calls', calls, 'tokens', tokens, 'ord', ord) order by ord), '[]'::jsonb)
      from (select endpoint, model, sum(cost) as cost, count(*) as calls, sum(tokens) as tokens, min(id) as ord from cur group by endpoint, model) g),
    'topUsers', (select coalesce(jsonb_agg(to_jsonb(u) order by u.ord), '[]'::jsonb) from top_users u),
    'system', (select coalesce(jsonb_agg(jsonb_build_object('uid', uid, 'cost', cost) order by ord), '[]'::jsonb) from by_user where uid = 'anonymous' or left(uid, 7) = 'system:'),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'cost', cost)), '[]'::jsonb)
      from (select (t - 10800000) / 86400000 as d, sum(cost) as cost from cur group by 1) dd)
  )
$$;

-- ── Métricas: oferta (paywall) e Live Voice no período ───────────────────────
create or replace function public.admin_metrics_paywall(p_from_ms bigint, p_to_ms bigint, p_now_ms bigint, p_level text, p_plan text)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with prm as (
    select (p_level is not null or p_plan is not null) as has_filter,
      'epoch'::timestamptz + (p_from_ms || ' milliseconds')::interval as from_ts,
      'epoch'::timestamptz + (p_to_ms || ' milliseconds')::interval as to_ts
  ),
  s as materialized (
    select f.* from public.admin_account_facts(p_now_ms, false, p_level) f
    where public.admin_plan_match(p_plan, f.taster, f.kind, f.annual)
  ),
  team as materialized (select * from public.admin_team_ids()),
  ch as materialized (select * from public.admin_first_charges(false)),
  ev as (
    select coalesce(e.user_id::text, 'null') as uid, e.event_name as name,
      case when e.platform in ('ios', 'android') then e.platform else 'web' end as plat,
      case jsonb_typeof(e.properties)
        when 'object' then e.properties
        when 'array' then e.properties
        when 'string' then case when (e.properties #>> '{}') ~ '^[ \t\n\r]*[\{\[]' then public.admin_try_jsonb(e.properties #>> '{}') end
      end as pr
    from public.charlotte_analytics_events e, prm
    where e.event_name in ('paywall_shown', 'paywall_purchase_tap', 'subscription_purchased')
      and e.created_at >= prm.from_ts and e.created_at <= prm.to_ts
      and ((prm.has_filter and e.user_id::text in (select s.id from s))
               or (not prm.has_filter and (e.user_id is null or e.user_id::text not in (select t.id from team t))))
  ),
  pev as materialized (
    select uid, name, plat,
      case when jsonb_typeof(pr) = 'object' and jsonb_typeof(pr -> 'reason') = 'string'
             and pr ->> 'reason' in ('placement', 'trail', 'track', 'taste_today', 'taste_done', 'other') then pr ->> 'reason' else 'other' end as reason,
      case when jsonb_typeof(pr) = 'object' and jsonb_typeof(pr -> 'kind') = 'string' then pr ->> 'kind' else 'outro' end as kind,
      ev.uid in (select ch.uid from ch) as paid
    from ev
  ),
  g as (
    select case when grouping(plat) = 0 then 'plat' when grouping(reason) = 0 then 'reason' else 'kind' end as dim,
      coalesce(plat, reason, kind) as key, name,
      count(distinct uid) as users, count(distinct uid) filter (where paid) as paid
    from pev
    group by grouping sets ((name, plat), (name, reason), (name, kind))
  ),
  lc as materialized (
    select coalesce(c.user_id::text, 'null') as uid, coalesce(c.duration_seconds, 0) as secs,
      coalesce(nullif(c.character, ''), 'charlotte') as ch, row_number() over (order by c.id) as ord
    from public.charlotte_live_calls c, prm
    where c.started_at >= prm.from_ts and c.started_at <= prm.to_ts
      and ((prm.has_filter and c.user_id::text in (select s.id from s))
               or (not prm.has_filter and (c.user_id is null or c.user_id::text not in (select t.id from team t))))
  )
  select jsonb_build_object(
    'groups', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) from g),
    'live', (select jsonb_build_object('calls', count(*), 'seconds', coalesce(sum(secs), 0), 'users', count(distinct uid)) from lc),
    'liveByCharacter', (select coalesce(jsonb_agg(jsonb_build_object('character', ch, 'calls', calls, 'seconds', secs) order by ord), '[]'::jsonb)
      from (select ch, count(*) as calls, sum(secs) as secs, min(ord) as ord from lc group by ch) z)
  )
$$;

-- ── Visão geral ─────────────────────────────────────────────────────────────
-- Bloco de usuários (grupos que somam o total), também usado pela atualização rápida da tela.
create or replace function public.admin_overview_users(p_now_ms bigint)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'total', count(*),
    'newToday', count(*) filter (where created_day = (p_now_ms - 10800000) / 86400000),
    'new30d', count(*) filter (where created_day >= (p_now_ms - 10800000) / 86400000 - 29),
    'taste', count(*) filter (where taster),
    'trial', count(*) filter (where not taster and trial_kind),
    'trialCancelled', count(*) filter (where not taster and trial_kind and subscription_status = 'cancelled'),
    'trialStore', count(*) filter (where not taster and trial_kind and kind = 'trial_store'),
    'trialSite', count(*) filter (where not taster and trial_kind and kind = 'trial_site'),
    'trialLegacy', count(*) filter (where not taster and trial_kind and kind = 'trial_legacy'),
    'paying', count(*) filter (where not taster and paid_kind),
    'payingCancelled', count(*) filter (where not taster and paid_kind and subscription_status = 'cancelled'),
    'noAccess', count(*) filter (where not taster and not trial_kind and not paid_kind)
  )
  from public.admin_account_facts(p_now_ms, true)
$$;

-- Restante da Visão geral: dias da semana, funil de 30 dias, dinheiro, retenção e sequências.
create or replace function public.admin_overview_aggregates(p_now_ms bigint)
returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with prm as (
    select (p_now_ms - 10800000) / 86400000 as today,
      'epoch'::timestamptz + ((((p_now_ms - 10800000) / 86400000 - 30) * 86400000 + 10800000) || ' milliseconds')::interval as practices_ts,
      (date_trunc('month', date '1970-01-01' + ((p_now_ms - 10800000) / 86400000)::int) - interval '5 months')::date - date '1970-01-01' as pnl_from_day,
      (date_trunc('month', date '1970-01-01' + ((p_now_ms - 10800000) / 86400000)::int))::date - date '1970-01-01' as month_from_day
  ),
  s as materialized (select * from public.admin_account_facts(p_now_ms, true)),
  team as materialized (select * from public.admin_team_ids()),
  p as materialized (
    select x.user_id::text as uid, (floor(extract(epoch from x.created_at) * 1000)::bigint - 10800000) / 86400000 as d
    from public.charlotte_practices x, prm
    where not (x.practice_type like '%reward%') and x.created_at >= prm.practices_ts
      and x.user_id is not null and not exists (select 1 from team t where t.id = x.user_id::text)
  ),
  pd as materialized (select distinct uid, d from p),
  days7 as (select prm.today - 6 + i as d from generate_series(0, 6) i, prm),
  -- Teste grátis iniciado: 1ª compra na loja (evento do app) ou 1ª compra do site com dias grátis.
  trial_start as (
    select uid, min(t) as t from (
      select coalesce(e.user_id::text, 'null') as uid, floor(extract(epoch from e.created_at) * 1000)::bigint as t
      from public.charlotte_analytics_events e
      where e.event_name = 'subscription_purchased'
      union all
      select k.user_id::text, floor(extract(epoch from k.created_at) * 1000)::bigint
      from public.asaas_checkouts k
      where k.sandbox = false and k.status = 'paid' and coalesce(k.trial_days, 0) > 0 and k.user_id is not null
    ) z
    where t is not null and not exists (select 1 from team tm where tm.id = z.uid)
    group by uid
  ),
  new_subs as (
    select c.first_ms from public.admin_first_charges(true) c
    where not exists (select 1 from team tm where tm.id = c.uid) and c.first_ms <= p_now_ms
  ),
  -- Receita por dia de Brasília desde o 1º dos 6 meses do resultado.
  rv as (
    select (at_ms - 10800000) / 86400000 as d, x.*
    from (
      select e.event_type, e.price_purchased > 0 as positive,
        coalesce(e.gross_brl, e.price_purchased, 0)::float8 as gross, coalesce(e.net_brl, 0)::float8 as net,
        case
          when e.purchased_at is not null then floor(extract(epoch from e.purchased_at) * 1000)::bigint
            + case when e.store = 'ASAAS' and floor(extract(epoch from e.purchased_at) * 1000)::bigint % 86400000 = 0 then 10800000 else 0 end
          else floor(extract(epoch from e.created_at) * 1000)::bigint
        end as at_ms
      from public.revenue_events e
      where e.app_user_id is not null and not exists (select 1 from team t where t.id = e.app_user_id)
    ) x
  ),
  rev_days as (
    select d,
      coalesce(sum(gross) filter (where c), 0) as gross,
      coalesce(sum(net) filter (where c), 0) as net,
      coalesce(sum(greatest(0, gross - net)) filter (where c), 0) as fees,
      count(*) filter (where c) as charges,
      count(*) filter (where rf) as refunds,
      coalesce(sum(net) filter (where rf), 0) as refunds_net,
      coalesce(sum(abs(net)) filter (where rf), 0) as refunds_abs
    from (select rv.*, (event_type is distinct from 'REFUND' and positive) is true as c, event_type = 'REFUND' as rf from rv) z, prm
    where d >= prm.pnl_from_day
    group by d
  ),
  prog as (
    select g.streak_days, g.last_practice_date from public.charlotte_progress g
    where g.user_id is not null and not exists (select 1 from team t where t.id = g.user_id::text)
  )
  select jsonb_build_object(
    'today', (select today from prm),
    'signups7', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', (select count(*) from s where s.created_day = days7.d))), '[]'::jsonb) from days7),
    'dau7', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', (select count(*) from pd where pd.d = days7.d))), '[]'::jsonb) from days7),
    'trials7', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', (select count(*) from trial_start where (trial_start.t - 10800000) / 86400000 = days7.d))), '[]'::jsonb) from days7),
    'newSubs7', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', (select count(*) from new_subs where (new_subs.first_ms - 10800000) / 86400000 = days7.d))), '[]'::jsonb) from days7),
    'revDays', (select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from rev_days r),
    'activeMonth', (select count(distinct uid) from pd, prm where d between prm.month_from_day and prm.today),
    'funnel', (select jsonb_build_object(
        'signups', count(*),
        'first', count(*) filter (where s.id in (select pd.uid from pd)),
        'trial', count(*) filter (where started_trial_ever),
        'paid', count(*) filter (where paid_ever))
      from s, prm where s.created_day >= prm.today - 29),
    'money', (select jsonb_build_object(
        'renewing', count(*) filter (where not taster and paid_kind and subscription_status = 'active'),
        'mrr', coalesce(sum(monthly_value) filter (where not taster and paid_kind and subscription_status = 'active'), 0),
        'trialsToCharge', count(*) filter (where not taster and kind in ('trial_store', 'trial_site') and subscription_status = 'active'),
        'trialMrr', coalesce(sum(monthly_value) filter (where not taster and kind in ('trial_store', 'trial_site') and subscription_status = 'active'), 0))
      from s),
    'charge7', (select coalesce(jsonb_agg(jsonb_build_object('d', d + 6,
        'site', (select count(*) from s where not taster and kind = 'trial_site' and subscription_status = 'active' and first_charge_day = days7.d + 6),
        'store', (select count(*) from s where not taster and kind = 'trial_store' and subscription_status = 'active' and first_charge_day = days7.d + 6))), '[]'::jsonb) from days7),
    'retention', (select coalesce(jsonb_agg(jsonb_build_object('x', x, 'eligible', eligible, 'retained', retained)), '[]'::jsonb) from (
        select x.x,
          count(*) filter (where prm.today >= s.created_day + x.x + 1) as eligible,
          count(*) filter (where prm.today >= s.created_day + x.x + 1 and (s.id, s.created_day + x.x) in (select pd.uid, pd.d from pd)) as retained
        from s cross join (values (1), (7)) as x(x) cross join prm
        where s.created_day >= prm.today - 13
        group by x.x) r),
    'activeStreaks', (select count(*) from prog, prm where coalesce(streak_days, 0) > 0 and last_practice_date >= date '1970-01-01' + (prm.today - 1)::int),
    'practicedToday', (select count(*) from prog, prm where coalesce(streak_days, 0) > 0 and last_practice_date = date '1970-01-01' + prm.today::int)
  )
$$;

-- Atividades por dia (Visão geral e Métricas filtram por created_at sem o usuário na frente).
-- Já existe practices_created_user_idx; chamadas de voz só tinham índice começando por user_id.
create index if not exists charlotte_live_calls_started_idx on public.charlotte_live_calls (started_at);

revoke all on function public.admin_try_jsonb(text) from public, anon, authenticated;
revoke all on function public.admin_team_ids() from public, anon, authenticated;
revoke all on function public.admin_first_charges(boolean) from public, anon, authenticated;
revoke all on function public.admin_account_facts(bigint, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_plan_match(text, boolean, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_metrics_accounts(bigint, bigint, bigint, int, text, text, int) from public, anon, authenticated;
revoke all on function public.admin_metrics_activity(bigint, bigint, bigint, int, text, text) from public, anon, authenticated;
revoke all on function public.admin_metrics_ai_cost(bigint, bigint, bigint, int, text, text) from public, anon, authenticated;
revoke all on function public.admin_metrics_paywall(bigint, bigint, bigint, text, text) from public, anon, authenticated;
revoke all on function public.admin_overview_users(bigint) from public, anon, authenticated;
revoke all on function public.admin_overview_aggregates(bigint) from public, anon, authenticated;
grant execute on function public.admin_try_jsonb(text) to service_role;
grant execute on function public.admin_team_ids() to service_role;
grant execute on function public.admin_first_charges(boolean) to service_role;
grant execute on function public.admin_account_facts(bigint, boolean, text) to service_role;
grant execute on function public.admin_plan_match(text, boolean, text, boolean) to service_role;
grant execute on function public.admin_metrics_accounts(bigint, bigint, bigint, int, text, text, int) to service_role;
grant execute on function public.admin_metrics_activity(bigint, bigint, bigint, int, text, text) to service_role;
grant execute on function public.admin_metrics_ai_cost(bigint, bigint, bigint, int, text, text) to service_role;
grant execute on function public.admin_metrics_paywall(bigint, bigint, bigint, text, text) to service_role;
grant execute on function public.admin_overview_users(bigint) to service_role;
grant execute on function public.admin_overview_aggregates(bigint) to service_role;
