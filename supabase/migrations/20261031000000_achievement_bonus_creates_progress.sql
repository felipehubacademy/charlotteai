do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.rn_award_achievements(uuid)'::regprocedure);
  if position('-- bonus sem progresso' in d) = 0 then
    n := regexp_replace(d, E'(\\n\\s*)UPDATE charlotte\\.progress(\\s+)SET total_xp = total_xp \\+ ach\\.xp_reward',
      E'\\1-- bonus sem progresso: conquista antes da primeira pratica (ex.: foto do perfil) cria o registro de XP\\1INSERT INTO charlotte.progress (user_id, total_xp, updated_at) VALUES (p_user_id, 0, now()) ON CONFLICT (user_id) DO NOTHING;\\1INSERT INTO charlotte.leaderboard_cache (user_id, user_level, total_xp, updated_at) VALUES (p_user_id, v_user_level, 0, now()) ON CONFLICT (user_id) DO NOTHING;\\1UPDATE charlotte.progress\\2SET total_xp = total_xp + ach.xp_reward');
    if n = d then raise exception 'rn_award_achievements: trecho do bonus nao encontrado'; end if;
    execute n;
  end if;
end $$;
