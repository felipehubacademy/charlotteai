-- Amigos de estudo pela busca (além do convite): pedido + aceite.
-- study_friends guarda o par uma vez (user_a < user_b). Acesso só pelo servidor.
create table if not exists friend_requests (
  from_id      uuid not null references auth.users(id) on delete cascade,
  to_id        uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (from_id, to_id)
);
create index if not exists friend_requests_to_idx on friend_requests(to_id, status);

create table if not exists study_friends (
  user_a     uuid not null references auth.users(id) on delete cascade,
  user_b     uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists study_friends_b_idx on study_friends(user_b);

alter table friend_requests enable row level security;
alter table study_friends enable row level security;

-- Aparecer na busca de alunos (Perfil → Preferências). Ligado por padrão.
alter table charlotte.users add column if not exists searchable boolean not null default true;
create or replace view public.charlotte_users as
SELECT users.id,
    users.email,
    users.name,
    users.charlotte_level,
    users.placement_test_done,
    users.first_welcome_done,
    users.is_institutional,
    users.is_active,
    users.subscription_status,
    users.trial_ends_at,
    users.must_change_password,
    users.expo_push_token,
    users.created_at,
    users.updated_at,
    users.live_voice_seconds_used,
    users.live_voice_reset_date,
    users.avatar_url,
    users.timezone,
    users.subscription_product,
    users.subscription_expires_at,
    users.last_practice_at,
    users.beta_features,
    users.is_admin,
    users.last_seen_at,
    users.trial_warning_sent_at,
    users.app_version,
    users.runtime_version,
    users.ota_update_id,
    users.app_platform,
    users.marketing_opt_out,
    users.email_bounced,
    users.live_voice_bonus_seconds,
    users.app_language,
    users.searchable
   FROM charlotte.users;

-- @usuário único
alter table charlotte.users add column if not exists username text;
create unique index if not exists users_username_key on charlotte.users (username);

create extension if not exists unaccent;

create or replace function charlotte.make_username(p_name text, p_email text, p_id uuid)
returns text language plpgsql as $$
declare
  parts text[];
  base  text;
  cand  text;
  n     int := 1;
begin
  parts := regexp_split_to_array(lower(unaccent(coalesce(nullif(trim(p_name), ''), split_part(coalesce(p_email, ''), '@', 1), 'aluno'))), '\s+');
  base := regexp_replace(parts[1] || coalesce(case when array_length(parts, 1) > 1 then parts[array_length(parts, 1)] end, ''), '[^a-z0-9]', '', 'g');
  if length(base) < 3 then base := base || 'queizy'; end if;
  base := left(base, 16);
  cand := base;
  while exists (select 1 from charlotte.users where username = cand and id <> p_id) loop
    n := n + 1;
    cand := left(base, 16) || n::text;
  end loop;
  return cand;
end $$;

create or replace function charlotte.set_username() returns trigger language plpgsql as $$
begin
  if new.username is null or new.username = '' then
    new.username := charlotte.make_username(new.name, new.email, new.id);
  end if;
  return new;
end $$;

drop trigger if exists users_set_username on charlotte.users;
create trigger users_set_username before insert or update of name on charlotte.users
  for each row when (new.username is null or new.username = '') execute function charlotte.set_username();

do $$
declare r record;
begin
  for r in select id, name, email from charlotte.users where username is null order by created_at loop
    update charlotte.users set username = charlotte.make_username(r.name, r.email, r.id) where id = r.id;
  end loop;
end $$;
create or replace view public.charlotte_users as
SELECT users.id,
    users.email,
    users.name,
    users.charlotte_level,
    users.placement_test_done,
    users.first_welcome_done,
    users.is_institutional,
    users.is_active,
    users.subscription_status,
    users.trial_ends_at,
    users.must_change_password,
    users.expo_push_token,
    users.created_at,
    users.updated_at,
    users.live_voice_seconds_used,
    users.live_voice_reset_date,
    users.avatar_url,
    users.timezone,
    users.subscription_product,
    users.subscription_expires_at,
    users.last_practice_at,
    users.beta_features,
    users.is_admin,
    users.last_seen_at,
    users.trial_warning_sent_at,
    users.app_version,
    users.runtime_version,
    users.ota_update_id,
    users.app_platform,
    users.marketing_opt_out,
    users.email_bounced,
    users.live_voice_bonus_seconds,
    users.app_language,
    users.searchable,
    users.username
   FROM charlotte.users;
