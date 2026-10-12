-- FAQ do suporte também na tela "Ajuda e suporte" do app: escolha por pergunta
-- (show_in_app) e versão em inglês gerada ao salvar (para quem usa o celular em inglês).
ALTER TABLE public.support_faq ADD COLUMN IF NOT EXISTS show_in_app boolean NOT NULL DEFAULT false;
ALTER TABLE public.support_faq ADD COLUMN IF NOT EXISTS section_en  text;
ALTER TABLE public.support_faq ADD COLUMN IF NOT EXISTS question_en text;
ALTER TABLE public.support_faq ADD COLUMN IF NOT EXISTS answer_en   text;
