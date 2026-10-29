begin;
-- Os caminhos públicos (views) rodavam com a permissão do dono e ignoravam as regras de cada tabela:
-- qualquer um com a chave pública lia e alterava dados de todos. Agora respeitam as regras de quem chama.
do $$
declare v record;
begin
  for v in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v' loop
    if v.relname <> 'charlotte_leaderboard_cache' then
      execute format('alter view public.%I set (security_invoker = true)', v.relname);
    end if;
    execute format('revoke all on public.%I from anon', v.relname);
    execute format('revoke truncate, references, trigger on public.%I from authenticated', v.relname);
  end loop;
end $$;
-- Ranking geral: só leitura, só para quem está logado (nome de exibição e XP, como no app).
revoke insert, update, delete on public.charlotte_leaderboard_cache from authenticated;
grant select on public.charlotte_leaderboard_cache to authenticated;
-- Sem login, nada nas tabelas internas.
do $$
declare t record;
begin
  for t in select schemaname, tablename from pg_tables where schemaname in ('charlotte', 'marketing', 'notifications') loop
    execute format('revoke all on %I.%I from anon', t.schemaname, t.tablename);
  end loop;
end $$;
commit;
