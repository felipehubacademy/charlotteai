-- Limite de tentativas em pontos públicos sem login (lib/rate-hits.ts):
--   wa_link_code  código do app errado ou vencido no WhatsApp do suporte (chave: telefone), 5 por hora
--   coupon_check  consulta de cupom no checkout do site (chave: IP)
--   rally_join    entrada em rally por código (chave: id do aluno)
-- Uma linha por tentativa; só a chave de servidor lê e grava. Linhas com mais de 2 dias são apagadas pelo próprio
-- código de tempos em tempos.
create table if not exists public.rate_hits (
  id bigserial primary key,
  kind text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_hits_kind_key_created_idx on public.rate_hits (kind, key, created_at desc);
create index if not exists rate_hits_created_idx on public.rate_hits (created_at);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;
