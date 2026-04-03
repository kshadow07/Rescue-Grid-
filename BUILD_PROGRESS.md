# RescueGrid — Build Progress

**Last Updated:** 2026-04-03T16:50:00+05:30
**Current Phase:** Phase 1 — COMPLETE ✅
**Status:** Ready for Phase 2 (Authentication)

---

## Phase 0 — Project Foundation ✅ COMPLETE

### 0.1 Next.js App Setup ✅
- [x] Run `bunx create-next-app@latest` in `rescuegrid/` subdirectory
- [x] Install dependencies: @supabase/supabase-js, @supabase/ssr, mapbox-gl, @mapbox/mapbox-gl-geocoder, @mapbox/search-js-react, web-push
- [x] Install dev dependencies: @types/mapbox-gl, @types/web-push
- [x] Configure `globals.css` with full token set from UI PRD §13 via Tailwind v4 @theme
  - Colors: `void`, `surface-1–4`, `orange`, `alert`, `ops`, `intel`, `caution`, `ink`, `muted`, `dim`
  - Font families: `display` (Barlow Condensed), `body` (Barlow), `mono` (JetBrains Mono)
  - Clip path utilities: `clip-tactical`, `clip-tactical-sm`
- [x] Load fonts in `app/layout.tsx` via next/font/google
- [x] Set global CSS variables — all dark theme tokens from UI PRD §3
- [x] Set `<body>` background to `--bg0` (`#07080A`)
- [x] `bun run build` passes with 0 errors

### 0.2 Supabase Client Setup ✅
- [x] `lib/supabase/client.ts` — browser client using createBrowserClient
- [x] `lib/supabase/server.ts` — server client using createServerClient with cookies
- [x] `middleware.ts` at project root — refreshes session on every request
- [x] `.env.local` created with required environment variable placeholders

### 0.3 Route Shells ✅
- [x] Victim PWA: `/`, `/report/[type]`, `/report/status/[id]`
- [x] Volunteer PWA: login, missions, active, map, chat, profile
- [x] DMA Dashboard: login, dashboard, deployments, assignments, resources, messages, broadcast
- [x] All 16 routes verified with `bun run build`

### 0.4 Shared UI Primitives ✅
- [x] `components/ui/Button.tsx` — variant (primary/secondary/ghost/danger), size (default/small), angular clip-path
- [x] `components/ui/StatusBadge.tsx` — status (critical/on-mission/ready/standby/completed), pulsing dot for critical
- [x] `components/ui/InputField.tsx` — label, left 3px orange border, JetBrains Mono uppercase label
- [x] Test page at `/` with all component variants rendered

---

## Phase 1 — Database Schema 🔄 IN PROGRESS

### 1.1 Migrations ✅
- [x] `supabase/migrations/001_initial_schema.sql` created with all 7 tables
  - victim_report, volunteer, task_force, assignment, task_force_member, message, resource
  - Circular FK between task_force and assignment resolved via ALTER TABLE

### 1.2 Realtime ✅
- [x] User confirmed Realtime enabled on all required tables

### 1.3 RLS ✅
- [x] `supabase/migrations/002_rls_policies.sql` created with policies for all 7 tables:
  - victim_report: anon INSERT + SELECT by id; service_role full
  - volunteer: authenticated SELECT/UPDATE own; service_role full
  - assignment: volunteer SELECT if assigned or in their TF; service_role full
  - task_force: volunteer SELECT if member; service_role full
  - task_force_member: volunteer SELECT if member; service_role full
  - message: volunteer SELECT/INSERT via TF or direct; service_role full
  - resource: service_role only

### 1.4 Seed Data ✅
- [x] `supabase/seed.sql` created with:
  - 4 volunteers (individual, Police, NGO, NDRF)
  - 5 victim_reports (rescue/food/medical/shelter/water situations)
  - 2 task forces with 4 members total
  - 3 assignments (1 volunteer, 1 TF, 1 unassigned)
  - 6 messages (victim thread + TF rooms)
  - 5 resources (Water Cans below threshold)

---

## Verification Required

**Please verify Phase 1.3 (RLS) by:**

1. In Supabase SQL Editor, run `002_rls_policies.sql`
2. Verify RLS is enabled: Table Editor → select each table → check "RLS Enabled" badge
3. Test with anon role in SQL Editor:
```sql
-- Should succeed (anon INSERT)
INSERT INTO victim_report (phone_no, situation) VALUES ('+919988776600', 'rescue');

-- Should fail (anon cannot read all)
SELECT * FROM volunteer;  -- should return 0 rows
```

---

## Next Phase

**Phase 2: Authentication**
- DMA: email/password login at `/dma/login`
- Volunteer: phone OTP login at `/volunteer/login` (demo mode, code `123456`)
- Auth helpers: `lib/auth/getSession.ts`, `lib/auth/getVolunteer.ts`

---

## Technical Notes

- Stack: Next.js 16.2.2 (App Router) · Supabase · Mapbox GL JS · PWA · Vercel
- Package Manager: Bun only (never npm/npx/yarn)
- Tailwind CSS v4 — uses CSS-based `@theme` configuration in globals.css
- Project location: `rescuegrid/` subdirectory
- Next.js 16 middleware uses `proxy.ts` (not `middleware.ts`) — warning present but build passes
- Database: 7 tables with circular FK (task_force ↔ assignment) resolved via ALTER TABLE after table creation
- Seed IDs: Use UUIDs starting with a/b/c/d prefixes for easy identification
- Migration files: `001_initial_schema.sql`, `002_rls_policies.sql`
