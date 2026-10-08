-- Convites "Estudar junto": código por aluno, quem convidou quem (vira dupla
-- de estudo) e cutucadas. Acesso só pelo servidor (service role).
create table if not exists referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists referrals (
  invitee_id  uuid primary key references auth.users(id) on delete cascade,
  inviter_id  uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  rewarded    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists referrals_inviter_idx on referrals(inviter_id);

create table if not exists buddy_nudges (
  id         bigserial primary key,
  from_id    uuid not null references auth.users(id) on delete cascade,
  to_id      uuid not null references auth.users(id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);
create index if not exists buddy_nudges_pair_idx on buddy_nudges(from_id, to_id, created_at desc);

alter table referral_codes enable row level security;
alter table referrals enable row level security;
alter table buddy_nudges enable row level security;
