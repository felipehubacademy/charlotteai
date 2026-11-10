-- Alertas do checkout resolvidos: some da Visão geral do /admin.
-- resolved_how: 'auto' (o vigia viu que o problema sumiu) ou 'manual' (botão "Resolvido").
alter table ops_alerts add column if not exists resolved_at timestamptz;
alter table ops_alerts add column if not exists resolved_by text;
alter table ops_alerts add column if not exists resolved_how text;
create index if not exists ops_alerts_open_idx on ops_alerts (created_at desc) where resolved_at is null;
