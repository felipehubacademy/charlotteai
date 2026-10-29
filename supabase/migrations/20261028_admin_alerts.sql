-- /admin: caixa de alertas (sino). Cada alerta enviado por notifyAdmins vira uma linha por pessoa da gestão,
-- mesmo com o push desligado ou sem aparelho inscrito. Só a chave de serviço lê e grava (RLS sem política).
create table if not exists public.admin_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  title       text not null,
  body        text not null default '',
  url         text,
  category    text,
  tag         text,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists admin_alerts_user_idx on public.admin_alerts (user_id, created_at desc);
alter table public.admin_alerts enable row level security;
