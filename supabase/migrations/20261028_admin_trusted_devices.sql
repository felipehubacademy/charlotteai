-- /admin: "Confiar neste computador por 30 dias" na verificação em duas etapas.
-- Guarda só o hash da chave entregue ao navegador. Só a chave de serviço lê e grava (RLS sem política).
create table if not exists public.admin_trusted_devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  token_hash  text not null unique,
  user_agent  text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists admin_trusted_devices_user_idx on public.admin_trusted_devices (user_id);
alter table public.admin_trusted_devices enable row level security;
