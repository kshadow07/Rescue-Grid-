# RescueGrid — Build Progress

**Last Updated:** 2026-04-03T20:25:00+05:30
**Current Phase:** Phase 4.1–4.5 — COMPLETE ✅
**Status:** Ready for Phase 5 (Assignment System)

---

## Phase 0 — Project Foundation ✅ COMPLETE

### 0.1 Next.js App Setup ✅
- [x] Run `bunx create-next-app@latest` in `rescuegrid/` subdirectory
- [x] Install dependencies: @supabase/supabase-js, @supabase/ssr, mapbox-gl, @mapbox/mapbox-gl-geocoder, @mapbox/search-js-react, web-push, react-map-gl
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

## Phase 3 — Victim Report Flow ✅ COMPLETE

### 3.1 Victim Home Screen (`/`) ✅ COMPLETE
- [x] Dark screen, `RESCUEGRID` logo centered top — RESCUE white / GRID orange, Barlow Condensed 700
- [x] Bilingual subtitle: "Report Emergency / आपातकाल रिपोर्ट करें" in muted Barlow
- [x] 2×3 grid of situation cards: Food · Water · Medical · Rescue · Shelter · Missing
- [x] Each card: angular clip-path on `--bg2`, colored left border by situation type
- [x] Icon, English label Barlow Condensed 18px 700 UPPERCASE, Hindi label Barlow 13px muted
- [x] Card tap → navigate to `/report/[type]`
- [x] Sticky bottom: `📞 HELPLINE: 1070` full-width primary Button (`href="tel:1070"`)
- [x] SOS badge in top-right of logo
- [x] "My Reports" link to `/report/my`

### 3.2 Report Form (`/report/[type]`) ✅ COMPLETE
- [x] Back arrow top-left → `/`
- [x] Mapbox GL JS map, 160px tall, dark style, draggable pin initialized at browser GPS
- [x] `↻ USE CURRENT LOCATION` ghost Button → calls `geolocation.getCurrentPosition()`
- [x] Detected place name below map in JetBrains Mono 11px dim
- [x] **People Affected** number input — how many people need help (included in message)
- [x] Phone `InputField` — `inputmode="tel"`, required
- [x] Optional message textarea — max 280 chars, character counter in Mono dim bottom-right
- [x] `SEND REPORT →` primary Button, full width — disabled while phone empty, spinner on submit
- [x] On submit: POST to `/api/victim/report` → on success navigate to `/report/status/[new_id]`
- [x] Situation-specific placeholder text for message field

### 3.3 API Route — Create Report ✅ COMPLETE
- [x] `POST /api/victim/report`
- [x] Validate: `phone_no`, `latitude`, `longitude`, `situation` required — 400 if missing
- [x] Call Mapbox Reverse Geocoding to get city and district
- [x] Insert into `victim_report` with service role client
- [x] Return `{ id }` with status 201

### 3.4 Report Status Screen ✅ COMPLETE
- [x] Fetch report on load by `id`
- [x] Display: `REPORT #KL-{YEAR}-{XXXX}`, situation badge, urgency badge
- [x] Live status badge — updates via Supabase Realtime on `victim_report WHERE id = [id]`
- [x] Message thread: DMA messages right-aligned (orange-dim), victim messages left-aligned (bg3)
- [x] Sender label + timestamp in JetBrains Mono 10px dim
- [x] Message input + `SEND →` → POST `/api/victim/message`
- [x] New DMA messages appear live via Realtime on `message WHERE victim_report_id = [id]`
- [x] Sticky bottom: `📞 CALL HELPLINE: 1070` primary Button

### 3.5 My Reports Page (`/report/my`) ✅ COMPLETE
- [x] "My Reports" from home → `/report/my`
- [x] Enter phone number → fetches all reports from `victim_report` where `phone_no` matches
- [x] No localStorage — DB is source of truth, real-time updates work automatically
- [x] Displays report cards with situation (colored border), status badge, city, timestamp
- [x] Tap card → navigates to `/report/status/[id]`
- [x] "New Report" button at bottom

---

## Phase 4 — DMA Dashboard Core ✅ COMPLETE

### 4.1 Dashboard Layout (`/dma/dashboard`) ✅
- [x] Three-column fixed layout: Left 260px | Center flex-1 | Right 320px
- [x] No full-page scroll, each column scrolls independently
- [x] Topbar 52px fixed at top

### 4.2 Topbar ✅
- [x] `RESCUE` (white) `GRID` (orange) logo, Barlow Condensed 20px 700
- [x] Nav tabs: Dashboard · Deployments · Resources · Broadcast · Messages
- [x] Active tab: orange text + 2px orange bottom border
- [x] Live counters: CRITICAL (red), ACTIVE (orange), VOLS (white)
- [x] Session timer: live ticking from login, green Mono text
- [x] `+ CREATE TASK` primary small Button
- [x] `EMERGENCY BROADCAST` danger small Button
- [x] Logout button

### 4.3 Mapbox Map (center) ✅
- [x] Dark map (`mapbox://styles/mapbox/dark-v11`) with satellite toggle
- [x] Victim report pins: colored by situation, sized by urgency, pulsing for critical/open
- [x] Click pin → popup with report details
- [x] Volunteer lettered avatar markers with status dot (green/orange/gray)
- [x] Layer toggles: Need Pins, Volunteer Locations, Relief Camps, Nearby Hospitals
- [x] District filter integration
- [x] **REFACTORED**: Switched to `react-map-gl` with React component markers (better positioning, no CSS transform conflicts)
- [x] **FIXED**: Popup hover flicker - popups now stay visible when transitioning from marker to popup with delayed hide (150ms)
- [x] **FIXED**: Removed default popup box background - popups now display cleanly without duplicate styling

### 4.4 Left Sidebar ✅
- [x] Situation type filter chips (Food/Water/Medical/Rescue/Shelter/Missing)
- [x] Urgency level toggles (Critical/Urgent/Moderate)
- [x] District dropdown filter
- [x] Map layer toggles
- [x] Resource summary cards with inline quantity editing
- [x] Color-coded stock bars (green >60%, amber 30-60%, red below threshold)
- [x] LOW STOCK badge when quantity < threshold

### 4.5 Right Sidebar ✅
- [x] Mission Control: Queue/Active/Duplicate/Done counters
- [x] Selected report panel with CALL and ASSIGN buttons
- [x] Live Responders list: name, type, skills, status badge, last_seen
- [x] Sorted: On Mission → Ready → Offline

### API Routes Created
- [x] `GET /api/dma/counters` — critical, active, vols counts
- [x] `GET /api/dma/assignment/counts` — queue/active/duplicate/done
- [x] `GET /api/volunteer/list` — all volunteers
- [x] `GET /api/volunteer/locations` — volunteers with lat/lng
- [x] `GET /api/dma/resource/list` — all resources
- [x] `GET /api/victim/reports` — all reports (updated to return array)

### Components Created
- [x] `components/dma/Topbar.tsx`
- [x] `components/dma/LeftSidebar.tsx`
- [x] `components/dma/RightSidebar.tsx`
- [x] `components/dma/MapboxMap.tsx`

---

## Verification Required

**Please verify Phase 4 by:**

### DMA Dashboard Test:
1. Navigate to `http://localhost:3000/dma/login` — DMA login page
2. Log in with DMA credentials (email/password)
3. Should redirect to `/dma/dashboard`
4. Confirm three-column layout: left sidebar (260px) | center map | right sidebar (320px)
5. Topbar shows: logo, nav tabs, live counters, session timer, CREATE TASK + BROADCAST buttons
6. Map loads with victim report pins (seed data)
7. Left sidebar: situation filters, urgency toggles, resource summary cards
8. Right sidebar: Mission Control counters, Responders list
9. Click a victim pin → report details in right sidebar
10. Satellite toggle button works (dark ↔ satellite)
11. Filters update map pins when toggled

---

## Next Phase

**Phase 5: Assignment System**
- 5.1: Create Assignment Modal with Mapbox SearchBox location
- 5.2: API Route — Create Assignment with push notifications
- 5.3: Assignments List (`/dma/assignments`)
- 5.4: API Route — Update Assignment Status

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
  - **⚠️ Future:** When ready for real OTP, enable Twilio in Supabase Dashboard → Authentication → Providers → Phone.

### New/Updated Files
- `app/(victim)/page.tsx` — Victim home screen with 2×3 situation card grid
- `app/(victim)/report/[type]/page.tsx` — Report form with Mapbox GPS
- `app/(victim)/report/status/[id]/page.tsx` — Report status + live message thread
- `app/api/victim/report/route.ts` — POST: validate, reverse geocode, insert victim_report
- `app/api/victim/message/route.ts` — POST: insert message as victim sender
- `lib/supabase/service.ts` — Service role client for server-side DB operations
- `app/layout.tsx` — Added `suppressHydrationWarning` to body for browser extension compatibility
- `components/dma/Topbar.tsx` — DMA topbar with logo, nav, counters, session timer
- `components/dma/LeftSidebar.tsx` — Filters + resource summary
- `components/dma/RightSidebar.tsx` — Mission control + responders
- `components/dma/MapboxMap.tsx` — Full Mapbox GL JS map component (refactored to use `react-map-gl` with React markers)
- `app/(dma)/dma/dashboard/page.tsx` — Main DMA dashboard page
- `app/api/dma/counters/route.ts` — Live counter API
- `app/api/dma/assignment/counts/route.ts` — Assignment status counts
- `app/api/volunteer/list/route.ts` — Volunteer list
- `app/api/volunteer/locations/route.ts` — Volunteer locations for map
- `app/api/dma/resource/list/route.ts` — Resource list
