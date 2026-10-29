-- Ajuda de acesso automática: quem pagou no site e não entrou no app em 24 h recebe o e-mail com link novo
-- de criar senha (/api/cron/access-help), uma única vez por compra.
alter table public.asaas_checkouts add column if not exists access_help_sent_at timestamptz;
