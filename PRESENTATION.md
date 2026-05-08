# Echo Chamber — Slide Content

---

## SLIDE 1 — Title

**Echo Chamber**
A collaborative archive for digital artifacts, lost media, and internet mysteries

---

## SLIDE 2 — The Problem

- The average lifespan of a webpage is 100 days
- 25%+ of links from the past decade return 404s
- Early web culture, indie games, niche communities — gone with no record
- The people who remember them have nowhere to document it

---

## SLIDE 3 — What It Is

A case-filing platform where users submit, investigate, and preserve digital history collaboratively.

Each submission is a **Case** with:
- A status: Unknown → Under Investigation → Explained → Archived
- A body of evidence (text, images, source links)
- A timeline of events
- Community analyses and discussion

---

## SLIDE 4 — Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + verification) |
| Storage | Supabase Storage (avatars, images) |
| Realtime | Supabase Postgres Changes |
| Animation | GSAP 3 |
| Hosting | Netlify |

No separate API server — Supabase handles auth, database, storage, and realtime in one.

---

## SLIDE 5 — Database Schema

**Core tables:**
- `profiles` — username, bio, admin/ban status, badge array
- `artifacts` — title, description, date, status, category, media (JSON), links (JSON)
- `timeline_entries` — chronological event log per artifact
- `analyses` — long-form writeups with vote scores
- `comments` — discussion per artifact
- `artifact_votes` / `analysis_votes` — vote tracking; trigger recalculates score on every vote
- `collections` + `collection_items` — user-curated sets
- `wall_posts` + `wall_post_cheers` — community wall with replies and reactions
- `reports` — moderation queue

**Notable:**
- RLS policies on every table — access rules enforced at database level, not client
- Rate limiting via SQL triggers (5 artifacts/hr, 20 comments/hr) — can't be bypassed from the client
- Vote scores recalculated automatically by trigger on every insert/delete
- Badge array updated automatically on contribution
- Two denormalized views handle complex joins once (`artifacts_feed`, `wall_posts_with_cheers`)

---

## SLIDE 6 — Key Architecture Decisions

**Business logic lives in the database, not the client**
- Rate limits, vote recalculation, badge updates, privilege protection — all SQL triggers
- A malicious client can't circumvent them

**JSON arrays in single fields**
- Multiple images and source links stored as JSON in one column
- Simpler schema; app parses with fallback for legacy single-string entries

**Optimistic UI for votes**
- Score updates immediately on click; trigger keeps the persisted value accurate

**Realtime without infrastructure**
- Community wall uses a single Postgres Changes subscription — no WebSocket server, no polling

---

## SLIDE 7 — Features: Catalog

- Full-text search across titles, descriptions, and authors
- Filter by category, status, date range
- Sort by newest, oldest, top-voted, alphabetical
- Archive timeline widget — click a year to filter to that era
- Tag cloud for thematic browsing
- Reddit-style voting on artifacts
- No account required to browse

---

## SLIDE 8 — Features: Artifact Page

Three-tab structure per case:

**Discussion** — open comment thread
**Timeline** — chronological entries anyone can add
**Analysis** — long-form peer-reviewed writeups, voted by community

Also:
- Image gallery (up to 30 uploaded images)
- Multiple source links (archive.org, mirrors, original URLs)
- Report functionality

---

## SLIDE 9 — Features: Submit a Case

- Title (300 chars), body (5000 chars)
- Category selector + create new category in real time
- Artifact date + status
- Multiple source links — add/remove dynamically
- Image upload: up to 30 images, 5 MB each, stored in Supabase Storage as JSON URL array
- Preview grid before submission

---

## SLIDE 10 — Features: Community

- **Voting** — upvote/downvote artifacts and analyses
- **Collections** — curate personal sets of related cases
- **Badge system** — earned automatically (Contributor, Archivist, Investigator, Curator, Veteran)
- **Community Wall** — real-time message board, 280-char limit, replies, cheers, live updates via Postgres Changes
- **Dashboard** — personal stats: cases filed, analyses submitted, upvotes received

---

## SLIDE 11 — Features: Admin Panel

- 14-day activity charts (artifacts, analyses, comments by day)
- Top contributors ranking
- User ban/unban management
- Badge assignment
- Report queue and moderation tools
- Case status overview

---

## SLIDE 12 — UI / UX

**Visual identity:** vintage archive — cream paper tones, warm borders, stamp aesthetic
**Typography:** Inter body, Special Elite + Rubik Dirt for headers
**Status colors:** Unknown (brown), Under Investigation (teal), Explained (green), Archived (rust)

**Patterns:**
- Card-based layout throughout
- 3D button press effect (translateY + inset shadow on active)
- GSAP card deck animation on homepage hero
- Character counters on all text inputs
- Inline loading/disabled states on every async action
- Empty states with context-specific copy

---

## SLIDE 13 — Demo

1. Homepage — card deck animation, live community wall
2. Catalog — search, filter, open a case
3. Artifact page — Discussion / Timeline / Analysis tabs
4. Submit Case — image upload, multiple links, category creation
5. Dashboard — badges, collections, stats
