-- Segurança, onda 1 (auditoria de 29/10/2026). Só banco: o app não precisa de atualização.
begin;

-- 1) Funções que o app nunca chama e que davam minutos, completavam desafio ou mexiam em dados de qualquer
--    conta (ou eram do sistema antigo de turmas): só o servidor (service role) pode chamar.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure::text sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname in (
      'grant_live_voice_minutes', 'rn_streak_challenge_tick', 'rn_streak_try_freeze', 'check_and_promote_level',
      'create_trial_access', 'expire_trials', 'has_active_trial', 'lms_verify_content_access',
      'add_student_to_class', 'add_user_role', 'transfer_student_between_classes', 'get_additional_roles_summary',
      'get_available_students', 'get_available_teachers', 'get_classes_with_stats', 'get_roles_audit_report',
      'get_teachers_with_additional_role', 'get_teachers_with_additional_role_safe', 'get_user_all_roles',
      'get_users_with_multiple_roles', 'get_users_with_role', 'user_has_role')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- 2) Funções que o app chama logado: sem login, não.
revoke execute on function public.alltime_ranking(text, integer) from public, anon;
revoke execute on function public.weekly_ranking(text) from public, anon;
revoke execute on function public.rn_award_achievements(uuid) from public, anon;
grant execute on function public.alltime_ranking(text, integer), public.weekly_ranking(text), public.rn_award_achievements(uuid) to authenticated, service_role;

-- 3) Conquistas: aluno logado só dispara a conferência da própria conta.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.rn_award_achievements(uuid)'::regprocedure);
  if position('auth.uid() <> p_user_id' in d) = 0 then
    d := regexp_replace(d, E'BEGIN\n', E'BEGIN\n  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN RETURN ''[]''::jsonb; END IF;\n', '');
    execute d;
  end if;
end $$;

-- 4) Gravar no chat, no vocabulário e na revisão: com as regras de quem chama (só a própria conta).
alter function public.compat_chat_messages_ins() security invoker;
alter function public.sr_items_insert() security invoker;
alter function public.sr_items_update() security invoker;
alter function public.sr_items_delete() security invoker;
alter function public.user_vocabulary_insert() security invoker;
alter function public.user_vocabulary_update() security invoker;
alter function public.user_vocabulary_delete() security invoker;

-- 5) Leituras e escritas indevidas.
drop policy if exists authenticated_view_own on charlotte.user_achievements;

drop policy if exists "Allow notification preferences access" on notifications.notification_preferences;
create policy notification_preferences_own on notifications.notification_preferences
  for all using (auth.role() = 'service_role' or auth.uid() = user_id)
  with check (auth.role() = 'service_role' or auth.uid() = user_id);

drop policy if exists "Users can view own notification logs" on notifications.notification_logs;
create policy notification_logs_own on notifications.notification_logs
  for select using (auth.role() = 'service_role' or auth.uid() = user_id);
drop policy if exists "Allow serverless insert notification_logs" on notifications.notification_logs;
drop policy if exists "Allow service to insert notification_logs" on notifications.notification_logs;

alter table charlotte.live_voice_grants enable row level security;
revoke all on charlotte.live_voice_grants from anon, authenticated;

drop policy if exists "tts-audio: service role insert" on storage.objects;

-- 6) Conta do aluno: campos que só a equipe ou o servidor mudam.
create or replace function charlotte.guard_user_update() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if coalesce(auth.role(), '') not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.is_institutional is distinct from old.is_institutional
     or new.is_admin is distinct from old.is_admin
     or new.beta_features is distinct from old.beta_features
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.hide_from_ranking is distinct from old.hide_from_ranking
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at
     or new.signup_welcome_sent_at is distinct from old.signup_welcome_sent_at
     or new.trial_welcome_sent_at is distinct from old.trial_welcome_sent_at
     or coalesce(new.live_voice_bonus_seconds, 0) > coalesce(old.live_voice_bonus_seconds, 0) then
    raise exception 'campo protegido da conta';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_user_update on charlotte.users;
create trigger trg_guard_user_update before update on charlotte.users for each row execute function charlotte.guard_user_update();

-- 7) Cadastro pelo app nunca nasce institucional (a equipe marca pelo /admin, com a chave do servidor).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.create_charlotte_user_on_signup()'::regprocedure);
  d := regexp_replace(d, E'v_is_institutional := COALESCE\\(\\s*\\(NEW\\.raw_user_meta_data->>''is_institutional''\\)::boolean,\\s*false\\s*\\);', 'v_is_institutional := false;');
  execute d;
end $$;

commit;
