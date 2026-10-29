create or replace function public.capacity_usage()
returns json
language sql
security definer
set search_path = public, storage, pg_catalog
as $$
  select json_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
    'connections', (select count(*) from pg_stat_activity),
    'max_connections', (select setting::int from pg_settings where name = 'max_connections'),
    'users', (select count(*) from auth.users)
  );
$$;
revoke all on function public.capacity_usage() from public, anon, authenticated;
grant execute on function public.capacity_usage() to service_role;
