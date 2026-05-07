# Architecture

This document captures the technical architecture, vendor choices, and a phased build plan for QUAD. It is downstream of the strategy memo; read that first if you haven't.

## Tech stack (recommended)

**Backend.** Node.js + TypeScript. Modern, fast, large hiring pool, the same language as the mobile and web clients (less context-switching for a small team). Alternative: Python + FastAPI if the team's center of mass is data-leaning.

**Database.** PostgreSQL with the PostGIS extension for geospatial queries. Single source of truth for users, filters, quads, calendar windows, deposits, and the reputation state machine. Optionally H3 hex tiles (Uber, MIT-licensed) for large-radius spatial clustering as scale grows.

**Cache.** Redis for hot matching state (active queues, in-progress quad formations, recent flake-priors).

**Search/discovery.** Postgres full-text is sufficient at launch. Move to Elasticsearch only when discovery latency stops being acceptable.

**Real-time messaging.** Pusher, Ably, or a managed WebSocket service for plan-execution chat in confirmed quads. Avoid building this from scratch.

**Mobile.** React Native — one codebase across iOS and Android, fastest path to a credible launch. Native Swift + Kotlin if iOS polish is a launch differentiator.

**Web.** Next.js. Server-side rendering for SEO on landing pages, React for the application surface (which should be minimal — calendar view, filter management, occasional quad confirmation).

## Vendor stack

| Concern | Vendor | Notes |
|---|---|---|
| Identity verification | Persona / Stripe Identity / Veriff | Government ID + selfie liveness check. |
| Background checks | Checkr | Premium tier only. |
| Payments and deposits | Stripe | Authorization holds for deposits, subscriptions for premium, refund webhooks. |
| Push notifications | Firebase Cloud Messaging | Free, ubiquitous, supports both platforms. |
| Email | Postmark or Resend | Transactional only — never marketing-style nurture campaigns. |
| SMS (safety) | Twilio | Emergency contact alerts, optional 2FA. |
| Calendar — Google | Google Calendar API | Freebusy on signup; event write-back at confirm. |
| Calendar — Apple | CalDAV + app-specific passwords | More integration friction than Google. |
| Geospatial | PostGIS (in DB) + H3 (in code) | Hex tiles for clustering, GiST indexes for radius. |
| Trust & safety signal | Sift or Trust Lab | Augments in-house moderation. |
| Error monitoring | Sentry | Standard. |
| Analytics | Mixpanel — but configured to track *outcome* metrics (quads attended, repeat partners, friendships formed) and explicitly NOT engagement metrics (DAU, time-in-app, session count). |

## Service boundaries (early)

A modular monolith is appropriate at launch. Split when scaling pressure requires it.

```
api/
├── auth/              # Identity verification, sessions, OAuth
├── users/             # Profile, filters, calendar tokens, consent flags
├── calendar/          # Google/Apple integration, freebusy queries, event writes
├── matching/          # Compatibility graph, quad formation, online matching
├── quads/             # Quad lifecycle: proposed, confirmed, completed, flaked
├── reputation/        # State machine, dead-chat statistics, ban logic
├── deposits/          # Stripe integration, holds, captures, refunds
├── safety/            # Reports, blocks, emergency button, check-in scheduler
├── graph/             # Mutual connections, BFS, consent-filtered queries
└── admin/             # Moderator dashboard, T&S queue
```

## Data model (sketch)

```
User (id, email, phone, verified_id, verified_premium, location, consent_flags, ...)
Filter (user_id, kind, value, intensity)         -- one row per filter dimension
TimeWindow (user_id, start_at, end_at, source)   -- materialized from calendar freebusy
Activity (id, name, category, default_duration)
Quad (id, status, time_window, location, activity, created_at)
QuadMember (quad_id, user_id, status)            -- invited, confirmed, attended, flaked
Deposit (id, user_id, quad_id, amount, status)  -- held, captured, refunded
ReputationEvent (user_id, kind, severity, at)    -- flake, dead_chat_flag, vouch
GraphEdge (a_user_id, b_user_id, quad_count)     -- materialized from QuadMember
Report (reporter_id, target_id, kind, body, status)
Ban (user_id, reason, until_at, redemption_path)
```

## Phased build plan

### Phase 0 — Algorithm prototype (weeks 1–4)
Already in this repo. Stress the matching engine with synthetic data. Calibrate the compatibility scoring, diversity penalty, and clique search before any user-facing surface exists. **Goal: prove the algorithm produces good quads under realistic filter distributions.**

### Phase 1 — Closed alpha, one neighborhood (months 2–5)
- Backend skeleton (auth, user, filter, calendar, matching, quad services)
- Stripe integration for deposits
- Identity verification (Persona/Stripe Identity)
- Mobile MVP (React Native): signup, filters, calendar grant, quad confirmation, basic chat for confirmed quads, attendance check-in
- **Skip for now:** background check, advanced filters, web client, B2B, multi-city
- Recruit 50–150 users in one Brooklyn or LES neighborhood, one or two activity verticals (running quads, brunch quads)
- **Goal: prove that real users will sign the Pledge, pay the deposit, and show up.**

### Phase 2 — Premium tier and safety stack (months 5–8)
- Background checks (Checkr)
- Verified Premium badge and filter
- Advanced filters (religion, profession, income bracket — with GDPR consent)
- Priority matching in low-liquidity windows
- Concierge safety support workflows
- One-tap emergency button
- Auto check-in during quads
- Report flow + moderator dashboard + T&S vendor integration
- Premium subscription billing
- **Goal: high-trust users have the trust infrastructure they expect; paid attach rate hits 10%+.**

### Phase 3 — Recurrence, second cohort (months 8–12)
- Persistent / recurring quads
- Earned-DM unlock after N shared quads
- Mutual-connections surface (decision-moment only)
- Web client (calendar view, filter management)
- Second neighborhood or cohort (new parents in adjacent neighborhood, religious congregation, etc.)
- Pattern-based dead-chat detection (with personalized baselines, generous floor, in-app meter, appeals path)
- **Goal: friendships start to durably form. Repeat-partner rate becomes a North Star metric.**

### Phase 4 — Multi-cohort, multi-city (year 2)
- Additional cities
- B2B pilots with hospital residency programs or law firms
- Localization
- Discovery surface (bounded, paginated, no infinite feed)
- **Goal: institutional revenue line. Wedge cohorts become reliable.**

## What we deliberately do NOT build

- ML training pipelines
- Content recommendation feeds
- Engagement analytics dashboards
- Notification spam infrastructure
- Public profile pages
- Friend-count or follower-count surfaces
- Stories / reels / short-form video

These categories are absent because the philosophy stack rules them out. The codebase is therefore *smaller* than a comparable social product, and the engineering team can stay smaller with it.

## What's hard (operational, not technical)

1. **Liquidity at launch** — a marketing-and-density problem more than a code problem.
2. **Calibrating dead-chat thresholds** — needs real user behavior data.
3. **Apple Calendar integration** — Apple's APIs have more friction than Google's.
4. **Trust and safety operations** — code is a small fraction; the larger work is policy, hiring moderators, escalation runbooks, handling the first incident gracefully.
5. **App Store review** — emergency button + geolocation + messaging combinations sometimes draw scrutiny. Write a clear reviewer note.
6. **GDPR / special-category data** — religion and profession filters need explicit consent and careful storage.

## Scope estimate

- **MVP (Phase 1):** 4–6 months, team of 2–3 engineers + 1 designer + 1 founder/PM.
- **Production-ready (Phases 1–2):** 8–12 months.
- **Multi-city (Phases 1–3):** 12–18 months.

None of this is research. It is well-understood software, executed carefully.