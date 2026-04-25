# Pre-Deploy Testing Guide (Staging)

Use this checklist against a **staging Supabase project** before production deployment.

## 0) Environment prep

- Update `.env` with staging values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Run `supabase/schema.sql` in staging SQL editor.
- Start app locally (`npm run dev`).

## 1) Authentication & account management

- [ ] Register new account (user A).
- [ ] Logout and login with user A.
- [ ] Update profile username + bio from Dashboard.
- [ ] Update password, logout, login using new password.
- [ ] Delete account from Dashboard (use test account only).

Expected:
- No 401/403 on allowed actions.
- Deleted account cannot log in again.

## 2) Artifact CRUD

- [ ] Create artifact with required fields.
- [ ] Edit artifact details.
- [ ] Delete artifact and confirm it disappears from catalog.
- [ ] Verify status chips and date render correctly.

Expected:
- Create/edit/delete works only for owner or admin.

## 3) Artifact page sections

- [ ] Add timeline entry.
- [ ] Add analysis.
- [ ] Add comment.
- [ ] Add report.

Expected:
- New records appear immediately after action.

## 4) Search / filters / sorting / pagination

- [ ] Search by title term.
- [ ] Search by username.
- [ ] Filter by category/status/date range.
- [ ] Sort by newest/oldest/relevance/title.
- [ ] Paginate across multiple pages.

Expected:
- Result counts and table rows reflect selected criteria.

## 5) Voting behavior

- [ ] Upvote/downvote artifact from catalog.
- [ ] Upvote/downvote analysis from artifact page.
- [ ] Repeat vote changes from same account.

Expected:
- Scores remain consistent (DB trigger-managed, no drift).

## 6) Badge progression

- [ ] Create >=3 artifacts (Contributor).
- [ ] Create >=3 analyses (Archivist).
- [ ] Create >=1 collection (Curator).
- [ ] Set artifact status to Explained and add analyses to meet Investigator threshold.

Expected:
- Badges update on profile/dashboard after qualifying actions.

## 7) Collections workflow

- [ ] Create collection.
- [ ] Add artifact to collection.
- [ ] Remove artifact from collection.

Expected:
- Collection items list remains accurate.

## 8) Admin workflow

- [ ] Promote one account to admin (SQL in `supabase/schema.sql`).
- [ ] Open `/admin` as admin.
- [ ] Ban/unban user.
- [ ] Resolve reports.
- [ ] Delete flagged artifact.
- [ ] Add/edit/remove categories.

Expected:
- Admin controls are functional and reflected in data.

## 9) Banned user restrictions

Use a banned non-admin account:

- [ ] Try create/edit/delete artifact.
- [ ] Try add timeline/analysis/comment.
- [ ] Try vote.
- [ ] Try report.

Expected:
- Account is read-only in UI and blocked by RLS.

## 10) Final release gate

- [ ] `npm run build` passes.
- [ ] No console errors in critical flows.
- [ ] SQL verification script passes (see `supabase/verify.sql`).
- [ ] Auth redirect URLs configured in Supabase.

If all checks pass, you are deployment-ready.
