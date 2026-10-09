-- "Lembrar" um pedido de amizade sem resposta (no máximo 1 vez por dia).
alter table friend_requests add column if not exists reminded_at timestamptz;
