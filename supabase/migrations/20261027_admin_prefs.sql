-- Preferências de cada pessoa da gestão (/admin > Minha conta).
-- Sem linha = padrão: todos os alertas ligados, sem horário de silêncio, todos os e-mails, tela inicial padrão.
create table if not exists public.admin_prefs (
  user_id uuid primary key,
  push_alerts jsonb not null default '{}'::jsonb,   -- { checkout, ticket_new, ticket_sla, capacity, ai_costs }: false desliga
  quiet_start smallint check (quiet_start between 0 and 23),  -- hora local (Brasília) em que o silêncio começa
  quiet_end smallint check (quiet_end between 0 and 23),      -- hora em que termina
  quiet_allow_critical boolean not null default true,         -- críticos (checkout, banco) passam no silêncio
  email_reports jsonb not null default '{}'::jsonb,  -- { ai_costs, learn_alerts, checkout, capacity }: false desliga
  home_path text,
  updated_at timestamptz not null default now()
);
alter table public.admin_prefs enable row level security;
