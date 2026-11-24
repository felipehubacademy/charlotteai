-- Aula em motion interativa dos Primeiros passos (Pré-Novice): cada pausa acertada grava uma prática do
-- tipo `aula` com 10 XP (apps/mobile/app/(app)/aula.tsx). O guard só aceita tipos da lista, então o tipo
-- novo entra aqui com teto 10. O resto da função é igual a 20261029203000_lock_xp_writes.sql (conferido
-- no banco em 24/11/2026 antes desta mudança).
begin;
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
    when 'aula'            then 10
    else null end;
  if v_cap is null then
    raise exception 'practice type not allowed from the app: %', new.practice_type;
  end if;
  new.xp_earned := least(greatest(coalesce(new.xp_earned, 0), 0), v_cap);
  return new;
end $$;
commit;
