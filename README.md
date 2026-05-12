# Internet Artifact Archive

A web app for collecting, browsing, and discussing internet history artifacts. It mixes a museum-catalog feel with a community workflow, so the app can be used both as an archive and as a place to submit new findings.

---

## What’s in the box

- React + Vite frontend
- Supabase authentication and data access
- Archive browsing, artifact detail pages, profiles, dashboard, and admin tools
- PostgreSQL schema and seed files in `supabase/`
- A layout system that leans into a vintage reference-archive style without getting in the way

---

## Tech stack

- **Frontend:** React 18, React Router, Vite
- **Backend:** Supabase (`@supabase/supabase-js`)
- **Styling/animation:** plain CSS, GSAP, and a few custom UI components

---

## Getting started

1. Install dependencies.
2. Create a `.env` file in the project root.
3. Add your Supabase project values.
4. Start the dev server.

### Environment variables

The app expects these values in `.env`:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Available scripts

```bash
npm run dev
npm run build
npm run preview
```

---

## Project layout

```text
src/
  components/   shared UI pieces and shell layout
  lib/          Supabase client and app helpers
  pages/        route-level screens
supabase/
  schema.sql    database schema
  seed_mock_posts.sql
  verify.sql
public/
  _redirects
```

---

## Notes

- The app checks for the Supabase env values at startup, so the `.env` file is required for local development.
- Admin features are protected in the UI and rely on the profile data returned from Supabase.
- The design uses an archive-style presentation on purpose: readable, a little nostalgic, and not trying too hard.


