# CourtVision

Badminton tournament app: sign-up with email codes, admin and player roles, single elimination, round robin and groups + knockout draws, live rally-by-rally scoring, and Elo rankings. React + Vite + Tailwind on the front, Supabase (Postgres, Auth, Realtime) behind it.

## 1. Database

```bash
supabase login
supabase link --project-ref demggguplthcwsfazngl
supabase db push
```

`db push` applies the two files in `supabase/migrations/`:

- `…_courtvision_schema.sql` creates the tables, row-level security, and the functions that change several rows at once (joining, seeding, generating draws, saving results).
- `…_import_2026_09_26.sql` imports the 26 September doubles tournament from the paper score sheets. Its final has no recorded winner; settle it in the app (open the final, **Score**, **Walkover or retired**).

If you ran `supabase init` in another folder, run it again in this repo (it only adds `supabase/config.toml`) before linking.

## 2. Auth settings (Supabase dashboard)

1. **Authentication → URL Configuration:** set **Site URL** to your deployed address (for example `https://courtvision.vercel.app`) and add `http://localhost:5173` under **Redirect URLs**.
2. **Authentication → Email Templates:** add `{{ .Token }}` to the **Magic Link** and **Confirm signup** templates so the email contains a code as well as the link. For example: `Your CourtVision code is {{ .Token }}`.
3. **Authentication → SMTP Settings:** connect a sender such as Resend, Brevo or Postmark. Supabase's built-in email is for testing only and won't reach your players.

## 3. Make yourself admin

Sign up in the app first, then run this in the Supabase **SQL Editor**:

```sql
update public.profiles set role = 'admin', admin_status = 'approved'
where id = (select id from auth.users where email = 'you@example.com');
```

After that, approve other admin requests from the Admin tab.

## 4. Run locally

```bash
cp .env.example .env.local     # paste your anon key
npm install
npm run dev                    # http://localhost:5173
```

Get the key with `supabase projects api-keys --project-ref demggguplthcwsfazngl`. Use the **anon** (publishable) key only; the service_role key must never go in the frontend.

## 5. Deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: Vite.
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.
4. Put the Vercel address into Supabase's Site URL (step 2).

Netlify and Cloudflare Pages work the same way: build command `npm run build`, output folder `dist`.

## How it fits together

```
src/
  lib/supabase.js          Supabase client (reads the two env vars)
  data/store.jsx           loads tables, listens to Realtime, turns UI actions into writes/RPCs
  engine/                  pure logic: bracket generation, standings, scoring rules
  ui/                      buttons, chips, icons, court diagram, toasts
  features/
    auth/                  email-code sign up and log in
    player/                dashboard and tournament cards
    tournament/            bracket views, match cards, players
    admin/                 admin console, create tournament, manage panel
    score/                 scorekeeper, final-score entry, walkover/retired
    rankings/              leaderboard
supabase/migrations/       schema + data import
```

**Security model.** Everyone signed in can read tournaments, draws, results and rankings. Only admins can create or change tournaments, draws and scores; this is enforced by row-level security in Postgres, not just hidden in the UI. Players join and leave through `join_tournament` / `leave_tournament`, which check that registration is open and the draw isn't full. Email addresses and phone numbers live in a separate `contacts` table that only the owner and admins can read. Players can't change their own role or rating.

**Results.** `record_result` saves the score, moves the winner into the next round, updates Elo ratings (walkovers excluded) and finishes the tournament when the final, or the last round-robin match, is decided, all in one transaction.
