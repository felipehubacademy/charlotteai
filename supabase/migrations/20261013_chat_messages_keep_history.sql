-- Histórico das conversas fica enquanto a conta existir (antes: só as 100 mensagens mais recentes por modo).
-- Exclusão da conta apaga tudo (api/delete-account). Áudios seguem com 90 dias (api/cron/chat-audio-cleanup).
DROP TRIGGER IF EXISTS trg_cleanup_chat_messages ON charlotte.chat_messages;
DROP FUNCTION IF EXISTS charlotte.cleanup_old_chat_messages();
