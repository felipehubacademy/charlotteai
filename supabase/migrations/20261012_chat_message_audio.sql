-- Free Chat: áudios das conversas (o do aluno e o da resposta) ficam salvos para tocar de novo ao reabrir.
-- Bucket privado; cada aluno só grava e lê a própria pasta ({auth.uid()}/...). O app toca por link temporário.
alter table charlotte.chat_messages add column if not exists audio_path text;
alter table charlotte.chat_messages add column if not exists audio_duration real;

create or replace view public.chat_messages as
 SELECT chat_messages.id,
    chat_messages.user_id,
    chat_messages.role,
    chat_messages.content,
    chat_messages.mode,
    chat_messages.created_at,
    chat_messages.session_id,
    chat_messages.impression,
    chat_messages.audio_path,
    chat_messages.audio_duration
   FROM charlotte.chat_messages;

insert into storage.buckets (id, name, public) values ('chat-audio', 'chat-audio', false)
on conflict (id) do nothing;

drop policy if exists "chat_audio_insert" on storage.objects;
create policy "chat_audio_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-audio' and (auth.uid())::text = (storage.foldername(name))[1]);

drop policy if exists "chat_audio_select" on storage.objects;
create policy "chat_audio_select" on storage.objects for select to authenticated
  using (bucket_id = 'chat-audio' and (auth.uid())::text = (storage.foldername(name))[1]);
