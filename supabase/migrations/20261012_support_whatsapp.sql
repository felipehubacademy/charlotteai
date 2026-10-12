-- Suporte por WhatsApp + aviso por e-mail só quando o ticket fica sem resposta.
alter table support_conversations add column if not exists sla_notified_at timestamptz;
alter table support_conversations add column if not exists last_inbound_at timestamptz;
alter table support_messages add column if not exists external_id text;
create unique index if not exists support_messages_external_id_key on support_messages(external_id) where external_id is not null;
