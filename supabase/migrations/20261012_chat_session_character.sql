-- Família Queizy: cada conversa do Free Chat é com um personagem (padrão: Charlotte).
alter table public.charlotte_chat_sessions add column if not exists character text not null default 'charlotte'
  check (character in ('charlotte', 'igorfina'));
