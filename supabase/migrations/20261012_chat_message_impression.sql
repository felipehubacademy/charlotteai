-- Família Queizy: imitação usada em cada resposta do Igorfina (selo "imitando" volta ao reabrir a conversa).
alter table charlotte.chat_messages add column if not exists impression text;

create or replace view public.chat_messages as
 SELECT chat_messages.id,
    chat_messages.user_id,
    chat_messages.role,
    chat_messages.content,
    chat_messages.mode,
    chat_messages.created_at,
    chat_messages.session_id,
    chat_messages.impression
   FROM charlotte.chat_messages;
