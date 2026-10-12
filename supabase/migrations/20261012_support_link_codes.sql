-- Liga o atendimento do WhatsApp ao aluno sem pedir telefone no cadastro:
-- o botão "Falar no WhatsApp" do app gera um código curto da conta logada, que vai
-- na mensagem já escrita. O webhook troca o código pelo aluno (confirmado).
CREATE TABLE IF NOT EXISTS public.support_link_codes (
  code        text PRIMARY KEY,                 -- ex.: Q7F3K2
  user_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_support_link_codes_user ON public.support_link_codes (user_id, created_at DESC);
ALTER TABLE public.support_link_codes ENABLE ROW LEVEL SECURITY;

-- true = aluno confirmado pelo código do app (ou e-mail do próprio remetente);
-- false = só informou um e-mail na conversa (não prova quem é).
ALTER TABLE public.support_conversations ADD COLUMN IF NOT EXISTS user_verified boolean NOT NULL DEFAULT false;
