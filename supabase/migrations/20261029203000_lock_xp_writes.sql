begin;
-- 1) O cálculo do XP roda com permissão própria (não depende de o aluno poder escrever no XP).
alter function public.rn_on_practice_insert() security definer set search_path = public, pg_temp;
alter function public.rn_award_achievements(uuid) security definer set search_path = public, pg_temp;

-- 2) Prática gravada pelo app: só tipos de estudo, com XP no máximo do tipo; recompensa só pelo servidor.
create or replace function charlotte.guard_practice_insert() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_cap int;
begin
  -- Vale só para o app (login do aluno ou anônimo); servidor, rotinas e o banco seguem livres.
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    raise exception 'practice for another user';
  end if;
  v_cap := case new.practice_type
    when 'learn_exercise'  then 15
    when 'grammar_message' then 5
    when 'text_message'    then 30
    when 'audio_message'   then 30
    when 'guided_chat'     then 30
    when 'roleplay'        then 25
    when 'vocab_review'    then 15
    when 'sr_review'       then 15
    else null end;
  if v_cap is null then
    raise exception 'practice type not allowed from the app: %', new.practice_type;
  end if;
  new.xp_earned := least(greatest(coalesce(new.xp_earned, 0), 0), v_cap);
  return new;
end $$;
drop trigger if exists trg_guard_practice_insert on charlotte.practices;
create trigger trg_guard_practice_insert before insert on charlotte.practices for each row execute function charlotte.guard_practice_insert();

-- 3) Aluno não altera nem apaga prática, nem mexe no total, no ranking ou nas conquistas.
drop policy if exists rn_practices_update on charlotte.practices;
drop policy if exists rn_practices_delete on charlotte.practices;
drop policy if exists rn_progress_insert on charlotte.progress;
drop policy if exists rn_progress_update on charlotte.progress;
drop policy if exists rn_leaderboard_own_insert on charlotte.leaderboard_cache;
drop policy if exists rn_leaderboard_own_update on charlotte.leaderboard_cache;
drop policy if exists authenticated_insert_own on charlotte.user_achievements;
drop policy if exists authenticated_update_own on charlotte.user_achievements;
revoke insert, update, delete on charlotte.progress, charlotte.leaderboard_cache, charlotte.user_achievements from anon, authenticated;
revoke update, delete on charlotte.practices from anon, authenticated;
revoke insert, update, delete on public.charlotte_progress, public.charlotte_leaderboard_cache, public.user_achievements from anon, authenticated;
revoke update, delete on public.charlotte_practices from anon, authenticated;
revoke insert, update, delete, truncate on charlotte.practices from anon;
revoke insert on public.charlotte_practices from anon;
commit;
