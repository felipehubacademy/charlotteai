-- Corrige o cadastro: os gatilhos do @usuário rodam pelo Auth (search_path = auth)
-- e não achavam unaccent(), então todo signup falhava. Aplicado em produção em 2026-10-09.
alter function charlotte.make_username(text, text, uuid) set search_path = public, extensions, charlotte;
alter function charlotte.set_username() set search_path = public, extensions, charlotte;
