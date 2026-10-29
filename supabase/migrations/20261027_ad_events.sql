-- Teste A/B de anúncios: cliques no link para as lojas (/baixar) e visitas ao site vindas de anúncio.
-- Sem dado pessoal: só campanha, lado do teste, plataforma e página.
create table if not exists public.ad_events (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('click', 'visit')),
  arm        text not null,          -- 'loja' (link /baixar) | 'site'
  campaign   text not null,
  source     text,
  platform   text,                   -- ios | android | desktop
  path       text
);
create index if not exists ad_events_campaign_idx on public.ad_events (campaign, created_at);
alter table public.ad_events enable row level security;
