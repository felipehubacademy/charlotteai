-- Marca endereços que deram bounce (NDR) pra não reenviar (higiene de lista).
ALTER TABLE charlotte.users
  ADD COLUMN IF NOT EXISTS email_bounced boolean NOT NULL DEFAULT false;
