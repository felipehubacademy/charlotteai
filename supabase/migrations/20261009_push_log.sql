-- Comprovante dos pushes diretos (pedidos, aceites, cutucadas, parabéns, competições).
-- Guarda o retorno do Expo para diagnosticar quem não recebe. Acesso só pelo servidor.
create table if not exists push_log (
  id         bigserial primary key,
  token      text not null,
  type       text,
  title      text,
  ok         boolean not null,
  error      text,
  ticket_id  text,
  created_at timestamptz not null default now()
);
create index if not exists push_log_token_idx on push_log(token, created_at desc);
alter table push_log enable row level security;
