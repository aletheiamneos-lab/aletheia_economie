-- Metrica comuna (identica in aplicatia de logica si in cea de economie):
-- tot spatiul ocupat in Supabase = baza de date (fizic, cu tot cu sistemul) + fisierele din Storage,
-- impartit pe categorii: rapoarte, documente, elevi/setari, sistem Supabase.
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
  table_total_bytes bigint;
  table_category text;
  active_rows_count bigint := 0;
  active_data_size_bytes bigint := 0;
  public_tables_size_bytes bigint := 0;
  table_stats jsonb := '{}'::jsonb;
  database_size_bytes bigint := pg_database_size(current_database());
  storage_bytes bigint := 0;
  storage_objects bigint := 0;
  bucket_stats jsonb := '{}'::jsonb;
  reports_bytes bigint := 0;
  documents_bytes bigint := 0;
  other_bytes bigint := 0;
  reports_files bigint := 0;
  documents_files bigint := 0;
  bucket_record record;
begin
  for table_record in
    select schemaname, tablename from pg_tables where schemaname = 'public' order by tablename
  loop
    execute format(
      'select count(*), coalesce(sum(pg_column_size(table_row)), 0) from %I.%I as table_row',
      table_record.schemaname, table_record.tablename
    ) into table_row_count, table_live_bytes;

    table_total_bytes := pg_total_relation_size(
      format('%I.%I', table_record.schemaname, table_record.tablename)::regclass
    );

    table_category := case
      when table_record.tablename ~ '(report|attempt|activity|progress|answer|result)' then 'reports'
      when table_record.tablename ~ '^(tests?|questions?)$|question|library|document|content' then 'documents'
      else 'other'
    end;

    if table_category = 'reports' then
      reports_bytes := reports_bytes + table_total_bytes;
    elsif table_category = 'documents' then
      documents_bytes := documents_bytes + table_total_bytes;
    else
      other_bytes := other_bytes + table_total_bytes;
    end if;

    active_rows_count := active_rows_count + table_row_count;
    active_data_size_bytes := active_data_size_bytes + table_live_bytes;
    public_tables_size_bytes := public_tables_size_bytes + table_total_bytes;
    table_stats := table_stats || jsonb_build_object(
      table_record.tablename,
      jsonb_build_object(
        'row_count', table_row_count,
        'active_data_size_bytes', table_live_bytes,
        'total_size_bytes', table_total_bytes,
        'category', table_category
      )
    );
  end loop;

  for bucket_record in
    select bucket_id, count(*) as files, coalesce(sum((metadata->>'size')::bigint), 0) as bytes
    from storage.objects
    group by bucket_id
  loop
    storage_bytes := storage_bytes + bucket_record.bytes;
    storage_objects := storage_objects + bucket_record.files;
    if bucket_record.bucket_id ~ 'report' then
      reports_bytes := reports_bytes + bucket_record.bytes;
      reports_files := reports_files + bucket_record.files;
    else
      documents_bytes := documents_bytes + bucket_record.bytes;
      documents_files := documents_files + bucket_record.files;
    end if;
    bucket_stats := bucket_stats || jsonb_build_object(
      bucket_record.bucket_id,
      jsonb_build_object(
        'files', bucket_record.files,
        'bytes', bucket_record.bytes,
        'category', case when bucket_record.bucket_id ~ 'report' then 'reports' else 'documents' end
      )
    );
  end loop;

  return jsonb_build_object(
    'database_size_bytes', database_size_bytes,
    'public_tables_size_bytes', public_tables_size_bytes,
    'active_data_size_bytes', active_data_size_bytes,
    'active_rows_count', active_rows_count,
    'table_stats', table_stats,
    'storage_size_bytes', storage_bytes,
    'storage_objects_count', storage_objects,
    'bucket_stats', bucket_stats,
    'total_size_bytes', database_size_bytes + storage_bytes,
    'categories', jsonb_build_object(
      'reports', jsonb_build_object('bytes', reports_bytes, 'files', reports_files),
      'documents', jsonb_build_object('bytes', documents_bytes, 'files', documents_files),
      'other', jsonb_build_object('bytes', other_bytes, 'files', 0),
      'system', jsonb_build_object('bytes', greatest(0, database_size_bytes - public_tables_size_bytes), 'files', 0)
    )
  );
end;
$$;

revoke all on function public.get_database_usage() from public, anon, authenticated;
grant execute on function public.get_database_usage() to service_role;

comment on function public.get_database_usage() is
  'Tot spatiul Supabase (baza de date + Storage), pe categorii: rapoarte, documente, elevi/setari, sistem.';
