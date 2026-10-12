-- Atendimento humano visível para o aluno: número do chamado (gerado a cada escalonamento),
-- quem assumiu (nome do atendente) e o nome de quem escreveu cada resposta humana.
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS ticket_code text;
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS taken_by    text;
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS taken_at    timestamptz;
ALTER TABLE public.support_messages      ADD COLUMN IF NOT EXISTS author_name text;
