-- Read-only inventory for a non-production RDS PostgreSQL copy.
-- Review the output before sharing it: defaults and policy expressions may contain environment-specific values.

SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (left(table_name, 6) = 'suite_' OR table_name = 'sonomarzi_schema_migrations')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, con.conname AS constraint_name, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (left(c.relname, 6) = 'suite_' OR c.relname = 'sonomarzi_schema_migrations')
ORDER BY table_name, constraint_name;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (left(tablename, 6) = 'suite_' OR tablename = 'sonomarzi_schema_migrations')
ORDER BY tablename, indexname;

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (left(tablename, 6) = 'suite_' OR tablename = 'sonomarzi_schema_migrations')
ORDER BY tablename, policyname;

SELECT c.relname AS table_name, t.tgname AS trigger_name, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public'
  AND (left(c.relname, 6) = 'suite_' OR c.relname = 'sonomarzi_schema_migrations')
ORDER BY table_name, trigger_name;
