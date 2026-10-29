-- Versão mais recente de cada loja, para o card "Tem versão nova do Queizy" na tela Início.
--   latest_version  versão liberada na loja; quem está abaixo vê o card (pode fechar; volta em 3 dias)
--   min_version     versão mínima aceita (só em caso grave); abaixo dela o card não fecha
-- Ao liberar versão nova numa loja: update app_release set latest_version = 'x.y.z' where platform = 'ios' | 'android'.
create table if not exists public.app_release (
  platform text primary key check (platform in ('ios', 'android')),
  latest_version text not null,
  min_version text,
  updated_at timestamptz not null default now()
);
alter table public.app_release enable row level security;
drop policy if exists app_release_read on public.app_release;
create policy app_release_read on public.app_release for select using (true);
grant select on public.app_release to anon, authenticated;
insert into public.app_release (platform, latest_version) values ('ios', '2.0.2'), ('android', '2.0.2')
  on conflict (platform) do nothing;
