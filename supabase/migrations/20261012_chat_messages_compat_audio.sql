-- A view public.chat_messages grava via INSTEAD OF (compat_chat_messages_ins), que só copiava as colunas antigas:
-- impression e audio_path/audio_duration eram descartados. Agora copia tudo.
CREATE OR REPLACE FUNCTION public.compat_chat_messages_ins()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN
  INSERT INTO charlotte.chat_messages (id, user_id, role, content, mode, session_id, created_at, impression, audio_path, audio_duration)
  VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.user_id,
    NEW.role,
    NEW.content,
    COALESCE(NEW.mode, 'chat'),
    NEW.session_id,
    COALESCE(NEW.created_at, NOW()),
    NEW.impression,
    NEW.audio_path,
    NEW.audio_duration
  );
  RETURN NEW;
END; $function$;

-- Limpeza dos áudios: lista os arquivos do bucket chat-audio criados antes do corte, inclusive os de mensagens
-- que o trg_cleanup_chat_messages (limite de 100 por modo) já apagou. Só o service role chama.
CREATE OR REPLACE FUNCTION public.chat_audio_expired(cutoff timestamptz, max_rows int DEFAULT 500)
 RETURNS TABLE(name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = storage, public
AS $function$
  SELECT o.name FROM storage.objects o
  WHERE o.bucket_id = 'chat-audio' AND o.created_at < cutoff
  ORDER BY o.created_at
  LIMIT max_rows;
$function$;
REVOKE ALL ON FUNCTION public.chat_audio_expired(timestamptz, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_audio_expired(timestamptz, int) TO service_role;
