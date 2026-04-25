-- Mock feed data for Internet Artifact Archive
-- Run in Supabase SQL Editor after schema.sql.

with author as (
  select id from public.profiles order by created_at asc limit 1
)
insert into public.artifacts (
  user_id,
  title,
  description,
  category_id,
  source_link,
  media_url,
  artifact_date,
  status,
  vote_score
)
select
  author.id,
  v.title,
  v.description,
  c.id,
  v.source_link,
  v.media_url,
  v.artifact_date::date,
  v.status,
  v.vote_score
from author
join (
  values
    (
      '2007 browser game with missing final level audio',
      'Community reports mention a hidden final level track in an archived browser game build. Current mirrors include gameplay assets, but the audio channel is stripped in every known SWF dump.',
      'Lost Media',
      'https://web.archive.org/',
      null,
      '2007-11-09',
      'Under Investigation',
      231
    ),
    (
      'Strange geocities backup page listing broken ARG clues',
      'A preserved index page references clue files that now return 404 in every mirror. We recovered two screenshot fragments and one dead domain registration entry for timeline correlation.',
      'ARGs',
      'https://web.archive.org/',
      null,
      '2003-04-22',
      'Unknown',
      118
    ),
    (
      'Forum thread documenting vanishing mascot campaign',
      'Archived forum logs capture users tracking a promotional mascot account that posted cryptic updates for 13 days before all image links were scrubbed from the host.',
      'Forums/Communities',
      'https://archive.org/',
      null,
      '2011-02-02',
      'Explained',
      89
    ),
    (
      'Deleted webcomic mirror with alternate ending panel',
      'A fan-maintained mirror appears to include an alternate final panel not present in official re-uploads. Metadata indicates this copy was scraped one day before takedown.',
      'Digital Art',
      'https://archive.org/',
      null,
      '2016-08-17',
      'Archived',
      307
    ),
    (
      'Early social profile featuring first meme format claims',
      'Profile snapshots include timestamped posts allegedly predating a well-known meme format. Authenticity is disputed due to timezone and export inconsistencies.',
      'Internet Culture',
      'https://web.archive.org/',
      null,
      '2005-09-30',
      'Under Investigation',
      154
    )
) as v(title, description, category_name, source_link, media_url, artifact_date, status, vote_score)
  on true
join public.categories c
  on c.name = v.category_name
where not exists (
  select 1 from public.artifacts a where a.title = v.title
);

-- Optional starter comments for existing mock artifacts
insert into public.comments (artifact_id, user_id, content)
select a.id, p.id, 'Initial triage note: source mirrors checked, waiting on checksum comparison.'
from public.artifacts a
join public.profiles p on p.id = a.user_id
where a.title in (
  '2007 browser game with missing final level audio',
  'Strange geocities backup page listing broken ARG clues'
)
and not exists (
  select 1 from public.comments c
  where c.artifact_id = a.id
    and c.content like 'Initial triage note:%'
);
