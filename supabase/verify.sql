-- Post-migration verification for staging/prod
-- Run after supabase/schema.sql

-- 1) RLS enabled across core tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles','categories','artifacts','timeline_entries','analyses','comments',
    'collections','collection_items','artifact_votes','analysis_votes','reports'
  )
order by tablename;

-- 2) Required helper functions
select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'delete_own_user','refresh_badges','is_admin','is_not_banned',
    'recalculate_artifact_score','recalculate_analysis_score'
  )
order by routine_name;

-- 3) Trigger presence
select event_object_table as table_name, trigger_name
from information_schema.triggers
where trigger_schema='public'
  and trigger_name in (
    'artifact_votes_update_score',
    'analysis_votes_update_score',
    'protect_profile_update_trg',
    'trg_badges_artifacts',
    'trg_badges_analyses',
    'trg_badges_collections'
  )
order by table_name, trigger_name;

-- 4) Base categories seeded
select id, name
from public.categories
order by name;

-- 5) Policy count sanity (non-zero for each protected table)
select schemaname, tablename, count(*) as policy_count
from pg_policies
where schemaname='public'
  and tablename in (
    'profiles','categories','artifacts','timeline_entries','analyses','comments',
    'collections','collection_items','artifact_votes','analysis_votes','reports'
  )
group by schemaname, tablename
order by tablename;
