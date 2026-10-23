-- Instagram (@queizyapp): posts agendados, comentários tratados pela IA e a chave de acesso.
-- Só o servidor (service role) lê e grava; o /admin passa pela API.

-- Posts do calendário. Só sai o que estiver 'aprovado' (aprovação no /admin > Instagram).
-- Ciclo: rascunho -> aprovado -> preparado (contêiner criado na Meta) -> publicado | erro | cancelado.
create table if not exists public.instagram_posts (
  id              uuid primary key default gen_random_uuid(),
  source_key      text unique,                 -- ex.: 2026-10-23-12h00 (importação idempotente)
  scheduled_at    timestamptz not null,
  linha           text,                        -- linha editorial
  kind            text not null check (kind in ('image', 'carousel', 'reels')),
  caption         text not null default '',
  media           jsonb not null default '[]', -- [{ url, type: 'image'|'video' }] na ordem do post
  cover_url       text,                        -- capa do Reels
  context         text,                        -- o que a IA precisa saber para responder comentários
  status          text not null default 'rascunho'
                  check (status in ('rascunho', 'aprovado', 'preparado', 'publicado', 'erro', 'cancelado')),
  approved_by     text,
  approved_at     timestamptz,
  ig_container_id text,
  ig_media_id     text,
  permalink       text,
  error           text,
  attempts        int not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists instagram_posts_due on public.instagram_posts (status, scheduled_at);
alter table public.instagram_posts enable row level security;

-- Comentários dos nossos posts e o que a IA fez com cada um.
create table if not exists public.instagram_comments (
  id            text primary key,              -- id do comentário na Meta
  post_id       uuid references public.instagram_posts(id) on delete set null,
  media_id      text not null,
  username      text,
  text          text,
  commented_at  timestamptz,
  action        text not null default 'pendente'
                check (action in ('pendente', 'respondido', 'escalado', 'oculto', 'ignorado', 'erro')),
  category      text,
  reply_text    text,
  reply_id      text,
  replied_by    text,                          -- 'ia' ou e-mail de quem respondeu pelo /admin
  note          text,
  created_at    timestamptz not null default now(),
  handled_at    timestamptz
);
create index if not exists instagram_comments_action on public.instagram_comments (action, created_at desc);
alter table public.instagram_comments enable row level security;

-- Chave de acesso (vale 60 dias; o cron renova). A primeira vem da env INSTAGRAM_ACCESS_TOKEN.
create table if not exists public.instagram_auth (
  id            int primary key default 1 check (id = 1),
  access_token  text not null,
  ig_user_id    text,
  username      text,
  env_hash      text,                          -- de qual chave da env esta veio (chave nova na env substitui)
  expires_at    timestamptz,
  refreshed_at  timestamptz not null default now()
);
alter table public.instagram_auth enable row level security;

-- Mídia pública dos posts (a Meta baixa as imagens e vídeos por URL).
insert into storage.buckets (id, name, public)
values ('instagram', 'instagram', true)
on conflict (id) do nothing;
