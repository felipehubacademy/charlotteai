-- Moderação da interação entre alunos (Guideline 1.2 da Apple): bloqueio e denúncia.
create table if not exists user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id);

create table if not exists user_reports (
  id          bigserial primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  context     text,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists user_reports_open_idx on user_reports(handled, created_at desc);

alter table user_blocks enable row level security;
alter table user_reports enable row level security;

-- Gerador do @: normaliza letras estilizadas (NFKC); fallback 'aluno' (queizy é reservado).
create or replace function charlotte.make_username(p_name text, p_email text, p_id uuid)
returns text language plpgsql as $$
declare
  parts text[];
  base  text;
  cand  text;
  n     int := 1;
begin
  parts := regexp_split_to_array(lower(unaccent(normalize(coalesce(nullif(trim(p_name), ''), split_part(coalesce(p_email, ''), '@', 1), 'aluno'), NFKC))), '\s+');
  base := regexp_replace(parts[1] || coalesce(case when array_length(parts, 1) > 1 then parts[array_length(parts, 1)] end, ''), '[^a-z0-9]', '', 'g');
  if length(base) < 3 then base := base || 'aluno'; end if;
  base := left(base, 16);
  cand := base;
  while exists (select 1 from charlotte.users where username = cand and id <> p_id) loop
    n := n + 1;
    cand := left(base, 16) || n::text;
  end loop;
  return cand;
end $$;
update charlotte.users set username = null where username = 'queizy';
update charlotte.users set username = charlotte.make_username(name, email, id) where username is null;

-- "Deixar de estudar junto": desfaz a amizade sem bloquear. Para pares do
-- convite (referrals, que ficam como histórico) o par vai para esta tabela;
-- um novo pedido aceito apaga a linha e a amizade volta.
create table if not exists study_unfriended (
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
alter table study_unfriended enable row level security;
