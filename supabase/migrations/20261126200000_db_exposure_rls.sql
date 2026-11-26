-- Exposição do banco (auditoria de 26/11):
--
-- 1. charlotte.openai_usage (custo de IA por aluno) estava sem RLS. Agora com RLS e sem regra para o app:
--    só a chave de servidor grava e lê (lib/openai-usage.ts, /api/admin/ai-costs); as funções do /admin
--    (security definer) continuam lendo pela view public.openai_usage.
-- 2. Esquema lms (legado do PWA, nenhum uso pelo app nem pelo site com a chave pública): anon tinha USAGE e
--    authenticated tinha SELECT/INSERT/UPDATE/DELETE em todas as tabelas; a view lms_user_stats_view mostrava
--    nome e e-mail de todos. Tira o acesso de anon e authenticated, liga RLS em todas as tabelas e as views
--    passam a respeitar as permissões de quem chama. A chave de servidor segue com acesso total.
-- 3. Bucket avatars: qualquer um podia listar todos os arquivos. A foto continua pública pelo link
--    (bucket público, getPublicUrl no app); listar e ler pela API só a própria pasta ({userId}/...), que é o
--    que o upload com upsert do app (AvatarCropModal) precisa.
begin;

-- 1. openai_usage
alter table charlotte.openai_usage enable row level security;
revoke all on charlotte.openai_usage from anon, authenticated;
revoke all on public.openai_usage from anon, authenticated;

-- 2. lms
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'lms' loop
    execute format('alter table lms.%I enable row level security', t.tablename);
  end loop;
  for t in select c.relname from pg_class c where c.relnamespace = 'lms'::regnamespace and c.relkind = 'v' loop
    execute format('alter view lms.%I set (security_invoker = true)', t.relname);
  end loop;
end $$;
revoke all on all tables in schema lms from anon, authenticated;
revoke all on all sequences in schema lms from anon, authenticated;
revoke all on all functions in schema lms from public, anon, authenticated;
revoke usage on schema lms from anon, authenticated;
alter default privileges in schema lms revoke all on tables from anon, authenticated;
alter default privileges in schema lms revoke all on sequences from anon, authenticated;
alter default privileges in schema lms revoke all on functions from public, anon, authenticated;
grant usage on schema lms to service_role;

-- 3. avatars: só a própria pasta pela API (o link público continua funcionando)
drop policy if exists "avatar_select" on storage.objects;
drop policy if exists "avatar_select_own" on storage.objects;
create policy "avatar_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

commit;
