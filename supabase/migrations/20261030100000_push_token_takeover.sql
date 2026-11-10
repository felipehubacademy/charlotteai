create or replace function charlotte.push_token_takeover() returns trigger language plpgsql security definer set search_path = charlotte, public as $$
begin
  if new.expo_push_token is not null and new.expo_push_token is distinct from old.expo_push_token then
    update charlotte.users set expo_push_token = null where expo_push_token = new.expo_push_token and id <> new.id;
  end if;
  return new;
end $$;
revoke execute on function charlotte.push_token_takeover() from public, anon, authenticated;
drop trigger if exists trg_push_token_takeover on charlotte.users;
create trigger trg_push_token_takeover after update of expo_push_token on charlotte.users for each row execute function charlotte.push_token_takeover();
update charlotte.users u set expo_push_token = null where u.expo_push_token is not null and exists (select 1 from charlotte.users o where o.expo_push_token = u.expo_push_token and o.id <> u.id and o.updated_at > u.updated_at);
