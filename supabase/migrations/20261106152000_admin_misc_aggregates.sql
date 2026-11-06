-- Contas do /admin, do relatório mensal, do "estudando agora" e das conferências das lojas feitas no banco.
-- Antes essas rotas baixavam as linhas uma a uma (práticas do mês, eventos de assinar, cliques de anúncio,
-- usos de cupom, comissões, receita inteira...) e contavam no servidor: com 10 a 100 mil alunos isso fica
-- lento ou estoura o tempo. Agora o banco devolve só o resultado (uma linha por grupo).
-- Somas em dinheiro: o servidor somava em ponto flutuante, linha por linha, na ordem da leitura. Para os
-- números saírem idênticos, a soma aqui é em float8, na mesma ordem, e volta como texto com
-- extra_float_digits = 1 (representação exata do float, que o servidor converte de volta com Number()).
-- Só a chave do servidor executa.

-- Índices que faltavam para as leituras por período e por aluno.
create index if not exists ad_events_created_idx on public.ad_events (created_at);
create index if not exists revenue_events_app_user_idx on public.revenue_events (app_user_id, created_at);

-- Relatório mensal: alunos que praticaram no período (distintos).
create or replace function public.admin_active_users_between(p_start timestamptz, p_end timestamptz)
returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct user_id)::int from public.charlotte_practices
  where created_at >= p_start and created_at < p_end
$$;

-- Relatório mensal: vendas do período por tipo de evento (purchased_at).
create or replace function public.revenue_event_type_counts(p_start timestamptz, p_end timestamptz)
returns table (event_type text, n int)
language sql stable security definer set search_path = public, pg_temp as $$
  select event_type, count(*)::int from public.revenue_events
  where purchased_at >= p_start and purchased_at < p_end
  group by event_type
$$;

-- "Estudando agora": quantas pessoas (fora o próprio aluno) praticaram desde p_since e quais dos amigos
-- (p_friends) estão entre elas. Uma linha, qualquer que seja o número de alunos.
create or replace function public.social_studying_now(p_user text, p_since timestamptz, p_friends text[])
returns table (studying int, buddies text[])
language sql stable security definer set search_path = public, pg_temp as $$
  with u as (select distinct user_id::text as id from public.charlotte_practices where created_at >= p_since)
  select (count(*) filter (where id <> p_user))::int,
    coalesce(array_agg(id) filter (where id = any(p_friends)), '{}')
  from u
$$;

-- Conferência das lojas: quem tocou em assinar ou comprou/restaurou no app (desde p_since; null = sempre),
-- um aluno por linha, na ordem do primeiro evento (a mesma ordem em que o servidor montava a lista).
create or replace function public.rc_candidate_user_ids(p_since timestamptz default null)
returns table (user_id uuid, first_id bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  select user_id, min(id) from public.charlotte_analytics_events
  where event_name in ('paywall_purchase_tap', 'subscription_purchased', 'subscription_restored')
    and created_at >= coalesce(p_since, '-infinity'::timestamptz)
  group by user_id
$$;

-- Teste A/B de anúncios: cliques e visitas por campanha desde p_since, na ordem do primeiro evento.
create or replace function public.ad_campaign_counts(p_since timestamptz)
returns table (campaign text, first_id bigint, clicks int, ios int, android int, desktop int, visits int)
language sql stable security definer set search_path = public, pg_temp as $$
  select campaign, min(id),
    (count(*) filter (where kind = 'click'))::int,
    (count(*) filter (where kind = 'click' and platform = 'ios'))::int,
    (count(*) filter (where kind = 'click' and platform = 'android'))::int,
    (count(*) filter (where kind = 'click' and platform is distinct from 'ios' and platform is distinct from 'android'))::int,
    (count(*) filter (where kind is distinct from 'click'))::int
  from public.ad_events where created_at >= p_since
  group by campaign
  order by 2
$$;

-- Cupons: usos (checkouts pagos) e receita por código.
create or replace function public.coupon_use_totals()
returns table (coupon_code text, uses int, revenue text)
language sql stable security definer set search_path = public, pg_temp set extra_float_digits = 1 as $$
  select coupon_code, count(*)::int, sum(coalesce(value_brl, 0)::float8 order by id)::text
  from public.asaas_checkouts
  where status = 'paid' and coupon_code is not null
  group by coupon_code
$$;

-- Afiliados: funil e comissões por afiliado. p_now = hora de referência do saldo (liberado x a liberar).
create or replace function public.affiliate_totals(p_since30 timestamptz, p_now timestamptz)
returns table (
  affiliate_id uuid, clicks int, clicks30 int, signups int, trials int, subscribers int,
  paying_users int, revenue_net text, bal_pending text, bal_available text, bal_paid text
)
language sql stable security definer set search_path = public, pg_temp set extra_float_digits = 1 as $$
  with ck as (
    select affiliate_id, count(*)::int as n, (count(*) filter (where created_at >= p_since30))::int as n30
    from public.affiliate_clicks group by affiliate_id
  ),
  att as (
    select a.affiliate_id, count(*)::int as n,
      (count(*) filter (where u.subscription_status = 'trial'))::int as trials,
      (count(*) filter (where u.subscription_status in ('active', 'cancelled')))::int as subs
    from public.affiliate_attributions a left join public.charlotte_users u on u.id = a.user_id
    group by a.affiliate_id
  ),
  cm as (
    select affiliate_id,
      (count(distinct user_id) filter (where kind = 'commission' and status is distinct from 'reversed' and not coalesce(is_test, false)))::int as paying,
      sum(coalesce(net_brl, 0)::float8 order by id) filter (where kind = 'commission' and status is distinct from 'reversed' and not coalesce(is_test, false)) as net,
      sum(coalesce(amount_brl, 0)::float8 order by id) filter (where status is distinct from 'reversed' and not coalesce(is_test, false)
        and status is distinct from 'paid' and not coalesce(date_trunc('milliseconds', available_at) <= p_now, false)) as pending,
      sum(coalesce(amount_brl, 0)::float8 order by id) filter (where status is distinct from 'reversed' and not coalesce(is_test, false)
        and status is distinct from 'paid' and coalesce(date_trunc('milliseconds', available_at) <= p_now, false)) as available,
      sum(coalesce(amount_brl, 0)::float8 order by id) filter (where status is distinct from 'reversed' and not coalesce(is_test, false)
        and status = 'paid') as paid
    from public.affiliate_commissions group by affiliate_id
  )
  select f.id, coalesce(ck.n, 0), coalesce(ck.n30, 0), coalesce(att.n, 0), coalesce(att.trials, 0), coalesce(att.subs, 0),
    coalesce(cm.paying, 0), cm.net::text, cm.pending::text, cm.available::text, cm.paid::text
  from public.affiliates f
  left join ck on ck.affiliate_id = f.id
  left join att on att.affiliate_id = f.id
  left join cm on cm.affiliate_id = f.id
$$;

-- Suporte: conversas por situação (na ordem do primeiro id, como o servidor montava).
create or replace function public.support_status_counts()
returns table (status text, n int)
language sql stable security definer set search_path = public, pg_temp as $$
  select status, count(*)::int from public.support_conversations
  group by status order by min(id::text collate "C")
$$;

-- Instagram: posts por situação.
create or replace function public.instagram_status_counts()
returns table (status text, n int)
language sql stable security definer set search_path = public, pg_temp as $$
  select status, count(*)::int from public.instagram_posts
  group by status order by min(id::text collate "C")
$$;

-- Custo de IA de um aluno no período: por endpoint, por modelo e total (grp), na ordem da primeira chamada.
create or replace function public.user_cost_breakdown(p_user text, p_from timestamptz, p_to timestamptz)
returns table (grp text, key text, cost text, calls int, tokens bigint)
language sql stable security definer set search_path = public, pg_temp set extra_float_digits = 1 as $$
  with r as (
    select id, coalesce(nullif(endpoint, ''), 'unknown') as ep, coalesce(nullif(model, ''), 'unknown') as md,
      coalesce(cost_usd, 0)::float8 as c, coalesce(total_tokens, 0) as t
    from public.openai_usage
    where user_id = p_user and created_at >= p_from and created_at <= p_to
  )
  select grp, key, cost, calls, tokens from (
    select 'endpoint' as grp, ep as key, min(id) as first_id, sum(c order by id)::text as cost, count(*)::int as calls, sum(t)::bigint as tokens from r group by ep
    union all
    select 'model', md, min(id), sum(c order by id)::text, count(*)::int, sum(t)::bigint from r group by md
    union all
    select 'total', null, 0, sum(c order by id)::text, count(*)::int, coalesce(sum(t), 0)::bigint from r
  ) x
  order by grp, first_id
$$;

-- Financeiro › receita por canal: canais (período desde p_since) e a taxa observada em todas as vendas.
-- Instante da cobrança como em lib/revenue-day (linha do site só com data = 00h de Brasília daquele dia).
-- first_pos: posição da primeira venda do canal no período (null = canal sem venda no período).
create or replace function public.finance_revenue_channels(p_since timestamptz)
returns table (channel text, first_pos bigint, sales int, refunds int, gross text, fees text, net text, has_obs boolean, obs_gross text, obs_fees text)
language sql stable security definer set search_path = public, pg_temp set extra_float_digits = 1 as $$
  with e as (
    select row_number() over (order by created_at, id) as pos,
      case
        when store = 'ASAAS' then case lower(coalesce(product_id, ''))
          when 'web_monthly' then 'site_monthly' when 'web_annual_pix' then 'site_annual_pix'
          when 'web_annual_12x' then 'site_annual_12x' else 'site_annual_card' end
        when store in ('APP_STORE', 'MAC_APP_STORE') then 'app_store'
        when store = 'PLAY_STORE' then 'play_store'
      end as ch,
      coalesce(gross_brl, 0)::float8 as g, coalesce(net_brl, 0)::float8 as n,
      coalesce(event_type = 'REFUND', false) as refund,
      not coalesce(
        date_trunc('milliseconds', coalesce(purchased_at, created_at))
          + case when store = 'ASAAS' and purchased_at is not null
                  and date_trunc('milliseconds', purchased_at) = date_trunc('day', purchased_at at time zone 'UTC') at time zone 'UTC'
                 then interval '3 hours' else interval '0' end
        < p_since, false) as inp
    from public.revenue_events
  ),
  f as (select *, greatest(0::float8, g - n) as fee from e where ch is not null)
  select ch,
    min(pos) filter (where inp),
    (count(*) filter (where inp and not refund))::int,
    (count(*) filter (where inp and refund))::int,
    (sum(case when refund then -g else g end order by pos) filter (where inp))::text,
    (sum(case when refund then -fee else fee end order by pos) filter (where inp))::text,
    (sum(case when refund then -n else n end order by pos) filter (where inp))::text,
    count(*) filter (where not refund and g > 0) > 0,
    (sum(g order by pos) filter (where not refund and g > 0))::text,
    (sum(fee order by pos) filter (where not refund and g > 0))::text
  from f group by ch
$$;

-- Financeiro › projeção: cada assinante ativo com a última cobrança paga (não reembolso, bruto > 0).
create or replace function public.finance_active_last_paid()
returns table (id uuid, subscription_expires_at timestamptz, is_institutional boolean, has_paid boolean, store text, product_id text, gross_brl numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  with lp as (
    select distinct on (app_user_id) app_user_id, store, product_id, gross_brl
    from public.revenue_events
    where app_user_id is not null and app_user_id <> '' and event_type is distinct from 'REFUND' and gross_brl > 0
    order by app_user_id, created_at desc, id desc
  )
  select u.id, u.subscription_expires_at, u.is_institutional, lp.app_user_id is not null, lp.store, lp.product_id, lp.gross_brl
  from public.charlotte_users u left join lp on lp.app_user_id = u.id::text
  where u.subscription_status = 'active'
$$;

-- Conferência do site: cobranças do processador (não reembolso) por aluno, para uma lista de alunos.
create or replace function public.asaas_revenue_counts(p_ids text[])
returns table (app_user_id text, n int)
language sql stable security definer set search_path = public, pg_temp as $$
  select app_user_id, count(*)::int from public.revenue_events
  where store = 'ASAAS' and app_user_id = any(p_ids) and event_type is distinct from 'REFUND'
  group by app_user_id
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_active_users_between(timestamptz, timestamptz)',
    'revenue_event_type_counts(timestamptz, timestamptz)',
    'social_studying_now(text, timestamptz, text[])',
    'rc_candidate_user_ids(timestamptz)',
    'ad_campaign_counts(timestamptz)',
    'coupon_use_totals()',
    'affiliate_totals(timestamptz, timestamptz)',
    'support_status_counts()',
    'instagram_status_counts()',
    'user_cost_breakdown(text, timestamptz, timestamptz)',
    'finance_revenue_channels(timestamptz)',
    'finance_active_last_paid()',
    'asaas_revenue_counts(text[])'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
