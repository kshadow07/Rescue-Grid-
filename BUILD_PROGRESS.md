# RescueGrid — Build Progress

**Last Updated:** 2026-04-03T17:20:00+05:30
**Current Phase:** Phase 2 — COMPLETE ✅ (REFACTORED)
**Status:** Ready for Phase 3 (Victim Report Flow)

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

## Phase 1 — Database Schema ✅ COMPLETE

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

## Phase 2 — Authentication ✅ COMPLETE

### 2.1 DMA Login (`/dma/login`) ✅
- [x] Page: `RESCUEGRID` logo, email `InputField`, password `InputField`, `LOGIN →` primary Button
- [x] Password visibility toggle (eye icon)
- [x] Calls `supabase.auth.signInWithPassword({ email, password })` on submit
- [x] On success → redirect to `/dma/dashboard`
- [x] On error → inline error in `--red-alert`, JetBrains Mono 11px

### 2.2 Volunteer Login (`/volunteer/login`) ✅ — REFACTORED
- [x] **TRUE DEMO MODE** — Single-step login, no OTP/SMS
- [x] Phone number input → validates against `volunteer` table
- [x] `POST /api/volunteer/login` — server-side validation using service_role
- [x] Sets `volunteer_session` cookie with `{ volunteer_id, phone, name }`
- [x] No Twilio/SMS dependency — works offline
- [x] On success → redirect to `/volunteer/missions`

### 2.3 Auth Helpers ✅
- [x] `lib/auth/getSession.ts` — server-side Supabase session retrieval (for DMA)
- [x] `lib/auth/getVolunteer.ts` — server-side volunteer from cookie session (for volunteer)

### 2.4 Middleware Auth Protection ✅
- [x] `/dma/*` routes (except `/dma/login`) redirect to `/dma/login` if no Supabase session
- [x] `/volunteer/*` routes (except `/volunteer/login`) redirect to `/volunteer/login` if no `volunteer_session` cookie

---

## Verification Required

**Please verify Phase 2 by:**

### DMA Login Test:
1. Navigate to `/dma/login`
2. You need a DMA user created in Supabase Auth dashboard (email + password)
3. Enter credentials → should redirect to `/dma/dashboard`
4. Clear session → access `/dma/dashboard` → should redirect back to `/dma/login`

### Volunteer Login Test:
1. Navigate to `/volunteer/login`
2. Enter a phone number from your seed data (e.g., `+919988776600` — Arjun Singh)
3. Click "LOGIN →" → should redirect to `/volunteer/missions`
4. Clear `volunteer_session` cookie → access `/volunteer/missions` → should redirect to `/volunteer/login`

**Note:** You must create at least one DMA user in Supabase Auth (Authentication → Add User → Email + Password) before testing DMA login.

---

## Next Phase

**Phase 3: Victim Report Flow**
- 3.1: Victim Home Screen (`/`) — 2×3 situation card grid
- 3.2: Report Form (`/report/[type]`) — Mapbox map + GPS + phone input
- 3.3: API Route — Create Report (`POST /api/victim/report`)
- 3.4: Report Status Screen (`/report/status/[id]`) — live status + message thread

---

## Technical Notes

- Stack: Next.js 16.2.2 (App Router) · Supabase · Mapbox GL JS · PWA · Vercel
- Package Manager: Bun only (never npm/npx/yarn)
- Tailwind CSS v4 — uses CSS-based `@theme` configuration in globals.css
- Project location: `rescuegrid/` subdirectory
- Next.js 16 uses `proxy.ts` convention (middleware warning present but build passes)
- Database: 7 tables with circular FK (task_force ↔ assignment) resolved via ALTER TABLE

### Auth Architecture (REFACTORED)
- **DMA Auth:** Supabase Auth email/password → `sb-access-token` / `sb-refresh-token` cookies
- **Volunteer Auth:** Custom demo mode → `volunteer_session` cookie (JSON with volunteer_id, phone, name)
  - No Twilio/SMS dependency
  - Validates phone against `volunteer.mobile_no` in DB
  - Cookie is httpOnly, secure in production, 7-day expiry
  - **⚠️ Future:** When ready for real OTP, enable Twilio in Supabase Dashboard → Authentication → Providers → Phone. The flow can be switched to `supabase.auth.signInWithOtp()` + `supabase.auth.verifyOtp()` without major code changes.

### New/Updated Files
- `app/(dma)/dma/login/page.tsx` — DMA login with password toggle
- `app/(volunteer)/volunteer/login/page.tsx` — Single-step demo login
- `app/api/volunteer/login/route.ts` — NEW: Demo mode API (validates phone, sets cookie)
- `lib/auth/getVolunteer.ts` — Updated for cookie-based volunteer session
- `middleware.ts` — Updated to check `volunteer_session` cookie for volunteer routes
