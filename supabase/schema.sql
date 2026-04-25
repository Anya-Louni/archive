-- Internet Artifact Archive (Supabase PostgreSQL)
-- Run in Supabase SQL Editor.
--
-- IMPORTANT: This schema includes:
-- - Row-level security (RLS) policies on all tables
-- - Input validation with CHECK constraints for max lengths
-- - Self-voting prevention on artifacts
-- - Banned user write restrictions
-- - Trigger-based vote score calculation
-- - Automatic badge refresh on user contributions
-- - User profile protection against privilege escalation
--
-- Re-running this script is safe - it uses "create ... if not exists" and
-- drops/recreates policies and triggers to apply latest hardening updates.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) >= 2 and length(username) <= 50),
  bio text check (bio is null or length(bio) <= 500),
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text unique not null check (length(name) >= 1 and length(name) <= 100)
);

create table if not exists public.artifacts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) >= 1 and length(title) <= 300),
  description text not null check (length(description) >= 1 and length(description) <= 5000),
  category_id bigint not null references public.categories(id),
  source_link text check (source_link is null or length(source_link) <= 2000),
  media_url text check (media_url is null or length(media_url) <= 2000),
  artifact_date date not null,
  status text not null check (status in ('Unknown','Under Investigation','Explained','Archived')) default 'Unknown',
  vote_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.timeline_entries (
  id bigint generated always as identity primary key,
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry text not null check (length(entry) >= 1 and length(entry) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.analyses (
  id bigint generated always as identity primary key,
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(content) >= 1 and length(content) <= 5000),
  vote_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(content) >= 1 and length(content) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) >= 1 and length(name) <= 200),
  description text check (description is null or length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  collection_id bigint not null references public.collections(id) on delete cascade,
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, artifact_id)
);

create table if not exists public.artifact_votes (
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  artifact_owner_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (artifact_id, user_id)
);

create table if not exists public.analysis_votes (
  analysis_id bigint not null references public.analyses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (analysis_id, user_id)
);

create table if not exists public.wall_posts (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  alias text not null,
  text text not null check (length(text) >= 1 and length(text) <= 280),
  reply_to bigint references public.wall_posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.wall_post_cheers (
  post_id bigint not null references public.wall_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  artifact_id bigint not null references public.artifacts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null check (status in ('Open','Resolved')) default 'Open',
  created_at timestamptz not null default now()
);

-- Rate limiting checks (prevent spam)
-- Limits per user per hour:
-- - Artifacts: 5
-- - Analyses: 10
-- - Comments: 20
-- - Votes: 50

create or replace function public.check_artifact_rate_limit()
returns trigger
language plpgsql
security definer
as $$
begin
  if (select count(*) from public.artifacts 
      where user_id = new.user_id 
      and created_at > now() - interval '1 hour') > 5 then
    raise exception 'Rate limit: maximum 5 artifacts per hour';
  end if;
  return new;
end;
$$;

create or replace function public.check_analysis_rate_limit()
returns trigger
language plpgsql
security definer
as $$
begin
  if (select count(*) from public.analyses 
      where user_id = new.user_id 
      and created_at > now() - interval '1 hour') > 10 then
    raise exception 'Rate limit: maximum 10 analyses per hour';
  end if;
  return new;
end;
$$;

create or replace function public.check_comment_rate_limit()
returns trigger
language plpgsql
security definer
as $$
begin
  if (select count(*) from public.comments 
      where user_id = new.user_id 
      and created_at > now() - interval '1 hour') > 20 then
    raise exception 'Rate limit: maximum 20 comments per hour';
  end if;
  return new;
end;
$$;

create or replace function public.check_vote_rate_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  vote_count integer;
begin
  -- Check both artifact and analysis votes
  select count(*) into vote_count from (
    select 1 from public.artifact_votes where user_id = new.user_id and created_at > now() - interval '1 hour'
    union all
    select 1 from public.analysis_votes where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) combined;
  
  if vote_count > 50 then
    raise exception 'Rate limit: maximum 50 votes per hour';
  end if;
  return new;
end;
$$;

drop trigger if exists rate_limit_artifacts on public.artifacts;
create trigger rate_limit_artifacts
before insert on public.artifacts
for each row execute procedure public.check_artifact_rate_limit();

drop trigger if exists rate_limit_analyses on public.analyses;
create trigger rate_limit_analyses
before insert on public.analyses
for each row execute procedure public.check_analysis_rate_limit();

drop trigger if exists rate_limit_comments on public.comments;
create trigger rate_limit_comments
before insert on public.comments
for each row execute procedure public.check_comment_rate_limit();

drop trigger if exists rate_limit_artifact_votes on public.artifact_votes;
create trigger rate_limit_artifact_votes
before insert on public.artifact_votes
for each row execute procedure public.check_vote_rate_limit();

drop trigger if exists rate_limit_analysis_votes on public.analysis_votes;
create trigger rate_limit_analysis_votes
before insert on public.analysis_votes
for each row execute procedure public.check_vote_rate_limit();

create index if not exists idx_artifacts_category on public.artifacts(category_id);
create index if not exists idx_artifacts_status on public.artifacts(status);
create index if not exists idx_artifacts_date on public.artifacts(artifact_date);
create index if not exists idx_artifacts_vote_score on public.artifacts(vote_score desc);
create index if not exists idx_analyses_artifact on public.analyses(artifact_id);
create index if not exists idx_comments_artifact on public.comments(artifact_id);
create index if not exists idx_reports_status on public.reports(status);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  desired_username text;
begin
  desired_username := coalesce(nullif(trim(new.raw_user_meta_data ->> 'username'), ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, username, badges)
  values (
    new.id,
    desired_username,
    array['Case Opened']::text[]
  )
  on conflict (id) do nothing;

  if exists (select 1 from public.profiles where id = new.id and username <> desired_username) then
    update public.profiles
    set username = desired_username || '_' || substring(replace(new.id::text, '-', '') from 1 for 6)
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.is_admin = true);
$$;

create or replace function public.is_not_banned(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.id = uid and p.is_banned = false);
$$;

create or replace function public.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.badges := old.badges;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_update_trg on public.profiles;
create trigger protect_profile_update_trg
before update on public.profiles
for each row execute procedure public.protect_profile_update();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists artifacts_set_updated_at on public.artifacts;
create trigger artifacts_set_updated_at
before update on public.artifacts
for each row execute procedure public.set_updated_at();

drop trigger if exists analyses_set_updated_at on public.analyses;
create trigger analyses_set_updated_at
before update on public.analyses
for each row execute procedure public.set_updated_at();

create or replace function public.sync_artifact_owner_id()
returns trigger
language plpgsql
as $$
begin
  if new.artifact_owner_id is null then
    select user_id into new.artifact_owner_id from public.artifacts where id = new.artifact_id;
  end if;
  return new;
end;
$$;

drop trigger if exists artifact_votes_set_owner on public.artifact_votes;
create trigger artifact_votes_set_owner
before insert or update on public.artifact_votes
for each row execute procedure public.sync_artifact_owner_id();

create or replace function public.recalculate_artifact_score(target_artifact bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.artifacts
  set vote_score = coalesce((select sum(v.value) from public.artifact_votes v where v.artifact_id = target_artifact), 0)
  where id = target_artifact;
end;
$$;

create or replace function public.recalculate_analysis_score(target_analysis bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.analyses
  set vote_score = coalesce((select sum(v.value) from public.analysis_votes v where v.analysis_id = target_analysis), 0)
  where id = target_analysis;
end;
$$;

create or replace function public.sync_artifact_score_from_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_artifact_score(coalesce(new.artifact_id, old.artifact_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.sync_analysis_score_from_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_analysis_score(coalesce(new.analysis_id, old.analysis_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists artifact_votes_update_score on public.artifact_votes;
create trigger artifact_votes_update_score
after insert or update or delete on public.artifact_votes
for each row execute procedure public.sync_artifact_score_from_votes();

drop trigger if exists analysis_votes_update_score on public.analysis_votes;
create trigger analysis_votes_update_score
after insert or update or delete on public.analysis_votes
for each row execute procedure public.sync_analysis_score_from_votes();

create or replace function public.refresh_badges(target_user uuid)
returns void
language plpgsql
security definer
as $$
declare
  artifact_count integer := 0;
  analysis_count integer := 0;
  explained_contrib_count integer := 0;
  collection_count integer := 0;
  account_age_days integer := 0;
  badge_list text[] := array['Case Opened'];
begin
  select count(*) into artifact_count from public.artifacts where user_id = target_user;
  select count(*) into analysis_count from public.analyses where user_id = target_user;
  select count(*) into explained_contrib_count
  from public.analyses a
  join public.artifacts ar on ar.id = a.artifact_id
  where a.user_id = target_user and ar.status = 'Explained';
  select count(*) into collection_count from public.collections where user_id = target_user;
  select extract(day from (now() - p.created_at))::int into account_age_days from public.profiles p where p.id = target_user;

  if artifact_count >= 3 then badge_list := array_append(badge_list, 'Contributor'); end if;
  if analysis_count >= 3 then badge_list := array_append(badge_list, 'Archivist'); end if;
  if explained_contrib_count >= 2 then badge_list := array_append(badge_list, 'Investigator'); end if;
  if collection_count >= 1 then badge_list := array_append(badge_list, 'Curator'); end if;
  if account_age_days >= 30 then badge_list := array_append(badge_list, 'Veteran'); end if;

  update public.profiles set badges = badge_list where id = target_user;
end;
$$;

create or replace function public.delete_own_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

create or replace function public.trigger_refresh_badges()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.refresh_badges(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_badges_artifacts on public.artifacts;
create trigger trg_badges_artifacts
after insert or delete on public.artifacts
for each row execute procedure public.trigger_refresh_badges();

drop trigger if exists trg_badges_analyses on public.analyses;
create trigger trg_badges_analyses
after insert or delete on public.analyses
for each row execute procedure public.trigger_refresh_badges();

drop trigger if exists trg_badges_collections on public.collections;
create trigger trg_badges_collections
after insert or delete on public.collections
for each row execute procedure public.trigger_refresh_badges();

create or replace view public.artifacts_feed as
select
  a.id,
  a.user_id,
  a.title,
  a.description,
  a.category_id,
  c.name as category_name,
  a.artifact_date,
  a.status,
  a.vote_score,
  a.created_at,
  p.username
from public.artifacts a
join public.categories c on c.id = a.category_id
join public.profiles p on p.id = a.user_id;

insert into public.categories (name)
values
('Lost Media'),
('Old Websites'),
('Internet Culture'),
('ARGs'),
('Digital Art'),
('Forums/Communities')
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.artifacts enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.analyses enable row level security;
alter table public.comments enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.artifact_votes enable row level security;
alter table public.analysis_votes enable row level security;
alter table public.reports enable row level security;
alter table public.wall_posts enable row level security;
alter table public.wall_post_cheers enable row level security;

drop policy if exists "Profiles are viewable" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Admins update any profile" on public.profiles;
drop policy if exists "Categories read" on public.categories;
drop policy if exists "Categories admin manage" on public.categories;
drop policy if exists "Artifacts read" on public.artifacts;
drop policy if exists "Artifacts insert own" on public.artifacts;
drop policy if exists "Artifacts owner or admin update" on public.artifacts;
drop policy if exists "Artifacts owner or admin delete" on public.artifacts;
drop policy if exists "Timeline read" on public.timeline_entries;
drop policy if exists "Timeline insert auth" on public.timeline_entries;
drop policy if exists "Timeline owner or admin delete" on public.timeline_entries;
drop policy if exists "Analyses read" on public.analyses;
drop policy if exists "Analyses insert auth" on public.analyses;
drop policy if exists "Analyses owner or admin update" on public.analyses;
drop policy if exists "Analyses owner or admin delete" on public.analyses;
drop policy if exists "Comments read" on public.comments;
drop policy if exists "Comments insert auth" on public.comments;
drop policy if exists "Comments owner or admin delete" on public.comments;
drop policy if exists "Collections read" on public.collections;
drop policy if exists "Collections insert own" on public.collections;
drop policy if exists "Collections owner or admin update" on public.collections;
drop policy if exists "Collections owner or admin delete" on public.collections;
drop policy if exists "Collection items read" on public.collection_items;
drop policy if exists "Collection items owner manage" on public.collection_items;
drop policy if exists "Artifact votes read" on public.artifact_votes;
drop policy if exists "Artifact votes own write" on public.artifact_votes;
drop policy if exists "Artifact votes own update" on public.artifact_votes;
drop policy if exists "Artifact votes own delete" on public.artifact_votes;
drop policy if exists "Analysis votes read" on public.analysis_votes;
drop policy if exists "Analysis votes own write" on public.analysis_votes;
drop policy if exists "Analysis votes own update" on public.analysis_votes;
drop policy if exists "Analysis votes own delete" on public.analysis_votes;
drop policy if exists "Reports read admin" on public.reports;
drop policy if exists "Reports insert auth" on public.reports;
drop policy if exists "Reports admin update" on public.reports;

create policy "Profiles are viewable" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admins update any profile" on public.profiles for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Categories read" on public.categories for select using (true);
create policy "Categories admin manage" on public.categories for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Artifacts read" on public.artifacts for select using (true);
create policy "Artifacts insert own" on public.artifacts for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Artifacts owner or admin update" on public.artifacts for update
using ((auth.uid() = user_id and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()));
create policy "Artifacts owner or admin delete" on public.artifacts for delete
using ((auth.uid() = user_id and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()));

create policy "Timeline read" on public.timeline_entries for select using (true);
create policy "Timeline insert auth" on public.timeline_entries for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Timeline owner or admin delete" on public.timeline_entries for delete
using (
  (auth.uid() = user_id and public.is_not_banned(auth.uid()))
  or public.is_admin(auth.uid())
  or (
    public.is_not_banned(auth.uid())
    and exists (select 1 from public.artifacts ar where ar.id = timeline_entries.artifact_id and ar.user_id = auth.uid())
  )
);

create policy "Analyses read" on public.analyses for select using (true);
create policy "Analyses insert auth" on public.analyses for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Analyses owner or admin update" on public.analyses for update
using ((auth.uid() = user_id and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()));
create policy "Analyses owner or admin delete" on public.analyses for delete
using (
  (auth.uid() = user_id and public.is_not_banned(auth.uid()))
  or public.is_admin(auth.uid())
  or (
    public.is_not_banned(auth.uid())
    and exists (select 1 from public.artifacts ar where ar.id = analyses.artifact_id and ar.user_id = auth.uid())
  )
);

create policy "Comments read" on public.comments for select using (true);
create policy "Comments insert auth" on public.comments for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Comments owner or admin delete" on public.comments for delete
using (
  (auth.uid() = user_id and public.is_not_banned(auth.uid()))
  or public.is_admin(auth.uid())
  or (
    public.is_not_banned(auth.uid())
    and exists (select 1 from public.artifacts ar where ar.id = comments.artifact_id and ar.user_id = auth.uid())
  )
);

create policy "Collections read" on public.collections for select using (true);
create policy "Collections insert own" on public.collections for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Collections owner or admin update" on public.collections for update
using ((auth.uid() = user_id and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()));
create policy "Collections owner or admin delete" on public.collections for delete
using ((auth.uid() = user_id and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()));

create policy "Collection items read" on public.collection_items for select using (true);
create policy "Collection items owner manage" on public.collection_items for all
using (
  exists (
    select 1 from public.collections c
    where c.id = collection_id
      and ((c.user_id = auth.uid() and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.collections c
    where c.id = collection_id
      and ((c.user_id = auth.uid() and public.is_not_banned(auth.uid())) or public.is_admin(auth.uid()))
  )
);

create policy "Artifact votes read" on public.artifact_votes for select using (true);
create policy "Artifact votes own write" on public.artifact_votes for insert with check (
  auth.uid() = user_id 
  and public.is_not_banned(auth.uid())
  and auth.uid() <> artifact_owner_id
);
create policy "Artifact votes own update" on public.artifact_votes for update using (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Artifact votes own delete" on public.artifact_votes for delete using (auth.uid() = user_id and public.is_not_banned(auth.uid()));

create policy "Analysis votes read" on public.analysis_votes for select using (true);
create policy "Analysis votes own write" on public.analysis_votes for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Analysis votes own update" on public.analysis_votes for update using (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Analysis votes own delete" on public.analysis_votes for delete using (auth.uid() = user_id and public.is_not_banned(auth.uid()));

create policy "Reports read admin" on public.reports for select
using (public.is_admin(auth.uid()));
create policy "Reports insert auth" on public.reports for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Reports admin update" on public.reports for update
using (public.is_admin(auth.uid()));

create policy "Wall posts are viewable" on public.wall_posts for select using (true);
create policy "Users can insert wall posts" on public.wall_posts for insert with check (public.is_not_banned(auth.uid()));
create policy "Users can delete own wall posts" on public.wall_posts for delete using (auth.uid() = user_id);

create policy "Wall post cheers are viewable" on public.wall_post_cheers for select using (true);
create policy "Users can cheer wall posts" on public.wall_post_cheers for insert with check (auth.uid() = user_id and public.is_not_banned(auth.uid()));
create policy "Users can remove own cheer" on public.wall_post_cheers for delete using (auth.uid() = user_id);

grant select on public.artifacts_feed to anon, authenticated;
grant execute on function public.delete_own_user() to authenticated;

-- Promote first manually selected account to admin (replace USER_UUID):
-- update public.profiles set is_admin = true where id = 'USER_UUID';

-- Additional performance indexes
create index if not exists idx_artifact_votes_user on public.artifact_votes(user_id);
create index if not exists idx_artifact_votes_owner on public.artifact_votes(artifact_owner_id);
create index if not exists idx_analysis_votes_user on public.analysis_votes(user_id);
create index if not exists idx_wall_posts_created on public.wall_posts(created_at asc);
create index if not exists idx_wall_post_cheers_post on public.wall_post_cheers(post_id);
create index if not exists idx_comments_user on public.comments(user_id);
create index if not exists idx_analyses_user on public.analyses(user_id);
create index if not exists idx_timeline_artifact on public.timeline_entries(artifact_id);
create index if not exists idx_collections_user on public.collections(user_id);

-- Wall posts view with cheer counts and authenticated user cheer status
create or replace view public.wall_posts_with_cheers as
select
  p.id,
  p.user_id,
  p.alias,
  p.text,
  p.reply_to,
  p.created_at,
  count(c.post_id)::int as cheer_count,
  (
    select count(*) > 0
    from public.wall_post_cheers wpc
    where wpc.post_id = p.id
      and wpc.user_id = auth.uid()
  ) as cheered_by_user
from public.wall_posts p
left join public.wall_post_cheers c on p.id = c.post_id
group by p.id, p.user_id, p.alias, p.text, p.reply_to, p.created_at
order by p.created_at asc;

grant select on public.wall_posts_with_cheers to anon, authenticated;

-- Wall posts: tighten RLS so anonymous (unauthenticated) callers cannot post
-- even if is_not_banned returns false for null uid, be explicit
drop policy if exists "Users can insert wall posts" on public.wall_posts;
create policy "Users can insert wall posts" on public.wall_posts
  for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and public.is_not_banned(auth.uid())
  );

-- Reports: allow users to see their own submitted reports (not just admins)
drop policy if exists "Reports read own" on public.reports;
create policy "Reports read own" on public.reports
  for select
  using (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Ensure wall post cheers require authentication
drop policy if exists "Users can cheer wall posts" on public.wall_post_cheers;
create policy "Users can cheer wall posts" on public.wall_post_cheers
  for insert
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and public.is_not_banned(auth.uid())
  );

-- Function: get top artifacts by vote score (used by popular posts widget)
create or replace function public.get_top_artifacts(result_limit integer default 5)
returns table (
  id bigint,
  title text,
  vote_score integer,
  category_name text,
  username text,
  artifact_date date,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.vote_score,
    c.name as category_name,
    p.username,
    a.artifact_date,
    a.status
  from public.artifacts a
  join public.categories c on c.id = a.category_id
  join public.profiles p on p.id = a.user_id
  order by a.vote_score desc
  limit result_limit;
$$;

grant execute on function public.get_top_artifacts(integer) to anon, authenticated;
