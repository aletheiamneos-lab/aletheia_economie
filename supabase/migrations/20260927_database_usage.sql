-- Metrica de utilizare pentru panoul administratorului (doar backend / service_role).
create or replace function public.get_database_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  table_record record;
  table_row_count bigint;
  table_live_bytes bigint;
  active_rows_count bigint := 0;
  active_data_size_bytes bigint := 0;
  table_stats jsonb := '{}'::jsonb;
  storage_bytes bigint := 0;
  storage_objects bigint := 0;
begin
  for table_record in
    select schemaname, tablename from pg_tables where schemaname = 'public' order by tablename
  loop
    execute format(
      'select count(*), coalesce(sum(pg_column_size(table_row)), 0) from %I.%I as table_row',
      table_record.schemaname, table_record.tablename
    ) into table_row_count, table_live_bytes;
    active_rows_count := active_rows_count + table_row_count;
    active_data_size_bytes := active_data_size_bytes + table_live_bytes;
    table_stats := table_stats || jsonb_build_object(
      table_record.tablename,
      jsonb_build_object('row_count', table_row_count, 'active_data_size_bytes', table_live_bytes)
    );
  end loop;

  select coalesce(sum((metadata->>'size')::bigint), 0), count(*)
    into storage_bytes, storage_objects
    from storage.objects;

  return jsonb_build_object(
    'database_size_bytes', pg_database_size(current_database()),
    'active_data_size_bytes', active_data_size_bytes,
    'active_rows_count', active_rows_count,
    'table_stats', table_stats,
    'storage_size_bytes', storage_bytes,
    'storage_objects_count', storage_objects
  );
end;
$$;

revoke all on function public.get_database_usage() from public, anon, authenticated;
grant execute on function public.get_database_usage() to service_role;
