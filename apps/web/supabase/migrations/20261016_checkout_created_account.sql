-- Checkout que criou a conta (a pessoa ainda não tinha cadastro): só essas contas podem ter o
-- e-mail corrigido depois (tela de sucesso do site ou suporte), e só enquanto nunca foram usadas.
alter table public.asaas_checkouts add column if not exists created_account boolean;
