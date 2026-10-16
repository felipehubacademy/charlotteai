-- Pixel/API de Conversões da Meta: aceite de cookies e identificadores do navegador no checkout
-- (fbp, fbc, IP, user agent). Só com aceite o servidor envia a conversão para a Meta.
alter table public.asaas_checkouts add column if not exists meta_tracking jsonb;
