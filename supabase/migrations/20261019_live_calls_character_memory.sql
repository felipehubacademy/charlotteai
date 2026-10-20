-- Ligações da Família Queizy no mesmo histórico da Charlotte: quem atendeu e a memória da conversa
-- (anotações curtas para a próxima ligação: assuntos, o que o aluno contou, o que ficou de perguntar).
alter table public.charlotte_live_calls add column if not exists character text not null default 'charlotte';
alter table public.charlotte_live_calls add column if not exists memory text;
create index if not exists charlotte_live_calls_user_char_idx on public.charlotte_live_calls (user_id, character, started_at desc);
