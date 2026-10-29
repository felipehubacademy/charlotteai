-- Aceite das tecnologias de IA, por conta (registro para Apple 5.1.2 e LGPD).
-- O app grava ao aceitar e lê ao abrir: conta que já aceitou não vê a tela de novo, nem em celular novo.
-- O aluno só lê e grava o próprio.
create table if not exists public.ai_consents (
  user_id      uuid primary key,
  accepted_at  timestamptz not null default now(),
  version      text not null default 'v1',
  platform     text,
  app_version  text
);
alter table public.ai_consents enable row level security;
drop policy if exists ai_consents_select_own on public.ai_consents;
create policy ai_consents_select_own on public.ai_consents for select to authenticated using (auth.uid() = user_id);
drop policy if exists ai_consents_insert_own on public.ai_consents;
create policy ai_consents_insert_own on public.ai_consents for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists ai_consents_update_own on public.ai_consents;
create policy ai_consents_update_own on public.ai_consents for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.ai_consents to authenticated;
