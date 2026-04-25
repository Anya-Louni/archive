# Internet Artifact Archive (Supabase Edition)

A subreddit-like archival platform for internet artifacts, designed with a physical archive aesthetic.

## Stack

- Frontend: React + Vite
- Backend/Data/Auth: Supabase (PostgreSQL + Auth + RLS)

## Implemented specification coverage

- Account system: register/login/logout/profile edit/password update/account deletion
- Dynamic badges: Contributor, Archivist, Investigator, Curator, Veteran (auto-refreshed in DB)
- Roles: User/Admin with ownership + admin override
- Artifact system: create/edit/delete/view with category/status/date/source/media
- Artifact page sections: overview, timeline, evidence links, analyses, discussion
- Tables: artifact table, user contribution table, admin users/reports/categories
- Form validation: required fields and inline errors
- Search: title/description/username
- Filtering: category/status/date range
- Sorting: newest/oldest/relevance/title
- Pagination: page controls and count-based pages
- Voting: artifacts and analyses
- Dashboard: user activity + badges + contributions
- Admin panel: users, bans, reports, flagged-content deletion, categories (add/edit/remove)
- Design language: archive-paper palette, ledger tables, stamp interactions, tabbed catalog feel

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and execute `supabase/schema.sql`.
   - It is idempotent for policies/triggers; re-running applies latest hardening updates.
   - Includes DB-side vote score triggers and banned-user write restrictions.
3. Optional demo content: run `supabase/seed_mock_posts.sql` to insert realistic starter artifacts/comments.
   - The catalog also includes a client-side fallback mock feed when your database is empty and no filters are applied.
4. In project settings, copy:
   - Project URL
   - anon public key
5. Fill `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Promote at least one user to admin using the SQL note at the bottom of `schema.sql`.

## Production checklist (ship-ready)

**Before deploying:**
- [ ] Copy `.env.example` to `.env` and fill with production Supabase values
- [ ] Enable Supabase Email Auth providers/settings you need
- [ ] Set strong redirect URLs in Supabase Auth settings (`https://yourdomain.com/auth`, etc.)
- [ ] Use production `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Run `supabase/schema.sql` in production project SQL editor
- [ ] Create first admin account, then promote it via SQL snippet in schema
- [ ] Run `npm run build` and verify no errors
- [ ] Run `supabase/verify.sql` to validate RLS/functions/triggers/policies
- [ ] Review [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for comprehensive pre-deployment guidance
- [ ] Verify core flows:
   - signup/login/logout (with email verification)
   - artifact CRUD
   - timeline/analysis/comment posting
   - voting (verify no self-votes)
   - report creation and admin moderation
   - category management
   - profile update/password change/account deletion
- [ ] Deploy with HTTPS only
- [ ] Test on production environment
- [ ] Monitor error logs in first 24 hours

## Security notes

- RLS is enabled on all tables in scope.
- Write actions are blocked for banned users at policy level.
- Vote totals are maintained by database triggers (not client trust).
- Non-admin users cannot privilege-escalate profile flags through updates.
- Users cannot vote on their own artifacts (RLS policy enforced).
- Email verification required before accessing protected features.
- All inputs have server-side length validation in database constraints.
- Session tokens are managed by Supabase Auth with automatic refresh.

## Local run

Install dependencies, then run Vite dev server.

- `npm install`
- `npm run dev`

Build check:

- `npm run build`

## Pre-deploy testing

- Follow `TESTING.md` for end-to-end manual QA flow.
- Run `supabase/verify.sql` after applying schema migration to validate RLS/functions/triggers/policies.

## Project structure

- `src/App.jsx` — app shell + routing + session/profile handling
- `src/pages/CatalogPage.jsx` — artifact feed, create/edit/delete, search/filter/sort/pagination, vote
- `src/pages/ArtifactPage.jsx` — overview/timeline/analysis/discussion/report
- `src/pages/DashboardPage.jsx` — user stats, contributions, profile management, and curator collections
- `src/pages/AdminPage.jsx` — admin dashboard, reports, users, flagged content moderation, categories
- `src/components/*` — reusable UI pieces/forms/tables
- `supabase/schema.sql` — schema, RLS policies, triggers, badge logic
- `supabase/seed_mock_posts.sql` — optional starter mock posts/comments for demo realism

## Deliverables mapping

- **Source code:** included in this repo
- **Report:** use README + exported architecture notes from this implementation
- **Presentation:** use the feature mapping section above as slide outline
