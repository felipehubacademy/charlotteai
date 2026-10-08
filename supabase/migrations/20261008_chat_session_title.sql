-- Título curto da conversa do Free Chat (3 a 5 palavras), gerado a partir do
-- tema tocado ou da primeira mensagem do aluno. Exibido no drawer de histórico.
alter table public.charlotte_chat_sessions add column if not exists title text;
