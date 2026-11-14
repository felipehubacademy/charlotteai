-- Funil do site para quem veio de anúncio (lib/site-funnel): passos depois da visita, em ad_events.
alter table public.ad_events drop constraint if exists ad_events_kind_check;
alter table public.ad_events add constraint ad_events_kind_check
  check (kind = any (array['click','visit','plans','checkout','form','submit','error']::text[]));

-- Contagem por campanha: visita passa a ser só 'visit' (antes era "tudo que não é clique") e entram os passos.
drop function if exists public.ad_campaign_counts(timestamptz);
create function public.ad_campaign_counts(p_since timestamptz)
returns table (campaign text, first_id bigint, clicks int, ios int, android int, desktop int, visits int,
               plans int, checkout_views int, form_starts int, submits int, errors int)
language sql stable security definer set search_path = public, pg_temp as $$
  select campaign, min(id),
    (count(*) filter (where kind = 'click'))::int,
    (count(*) filter (where kind = 'click' and platform = 'ios'))::int,
    (count(*) filter (where kind = 'click' and platform = 'android'))::int,
    (count(*) filter (where kind = 'click' and platform is distinct from 'ios' and platform is distinct from 'android'))::int,
    (count(*) filter (where kind = 'visit'))::int,
    (count(*) filter (where kind = 'plans'))::int,
    (count(*) filter (where kind = 'checkout'))::int,
    (count(*) filter (where kind = 'form'))::int,
    (count(*) filter (where kind = 'submit'))::int,
    (count(*) filter (where kind = 'error'))::int
  from public.ad_events where created_at >= p_since
  group by campaign
  order by 2
$$;
revoke all on function public.ad_campaign_counts(timestamptz) from public, anon, authenticated;
grant execute on function public.ad_campaign_counts(timestamptz) to service_role;
