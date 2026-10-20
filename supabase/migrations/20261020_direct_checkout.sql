-- Checkout próprio (cartão e Pix no queizy.com, pela API do Asaas).
-- channel: 'hosted' (página do Asaas) ou 'direct' (nosso formulário).
-- sandbox: compra feita no ambiente de testes (não vira receita, comissão nem conversão).
alter table asaas_checkouts add column if not exists channel text not null default 'hosted';
alter table asaas_checkouts add column if not exists sandbox boolean not null default false;
-- Tentativas de cartão (proteção contra robôs testando cartão): kind 'card', ok = aprovado.
alter table checkout_attempts add column if not exists kind text;
alter table checkout_attempts add column if not exists cpf text;
alter table checkout_attempts add column if not exists ok boolean;
create index if not exists checkout_attempts_kind_created_idx on checkout_attempts (kind, created_at);
-- Pix do checkout próprio: id da cobrança aguardando pagamento (a tela consulta até cair).
alter table asaas_checkouts add column if not exists pending_payment_id text;
