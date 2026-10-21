-- Vigia do checkout (lib/ops-monitor): erros das rotas críticas e alertas já enviados (para não repetir).
create table if not exists ops_errors (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  area text not null,        -- checkout | webhook | auth | asaas
  route text,
  message text,
  detail jsonb
);
create index if not exists ops_errors_created_idx on ops_errors (created_at desc);
create table if not exists ops_alerts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  message text not null,
  sent_email boolean default false,
  sent_whatsapp boolean default false
);
create index if not exists ops_alerts_kind_created_idx on ops_alerts (kind, created_at desc);
alter table ops_errors enable row level security;
alter table ops_alerts enable row level security;
