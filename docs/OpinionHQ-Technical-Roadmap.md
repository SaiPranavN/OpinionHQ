# OpinionHQ — Technical Implementation Roadmap

Based on `docs/ProjectBrief.md` and `AGENTS.md`. Solo-dev friendly, TypeScript throughout, no unnecessary microservices, self-hosted on your own domain (no Vercel).

> **§1 "Backend / Data" and "Auth", and §2, are superseded by
> [`docs/database.md`](database.md).** The data layer is Supabase — Postgres, its
> auth service, and row-level security — in place of Prisma, Auth.js and a
> self-hosted Postgres. The decision and what it bought are argued in that
> document; the short version is that Ask Verified's privacy rules belong in the
> database rather than in whichever handler remembers to check them.
>
> The phasing in §3 still describes the order of the work, and §4's argument
> about avoiding Vercel is unaffected: the app remains a plain Node container
> that talks to a Postgres over the network. The sections below are kept as
> written so the reasoning that led here stays readable.

---

## 1. Tech Stack

### Application
- **Framework:** Next.js (App Router) + React + TypeScript — one codebase for landing page, entity dashboards, admin panel, and API routes.
- **Styling:** Tailwind CSS + a small component layer (shadcn/ui-style primitives) for cards, tabs, badges, forms.
- **Charts:** Recharts for sentiment distribution/trend/participation charts (simple, composable, good enough for MVP-level analytics). ECharts is a fallback if you need heavier viz later (polarization, geo maps).
- **Forms/validation:** React Hook Form + Zod (shared schemas between client and API for opinion submission, entity creation, etc.).

### Backend / Data
- **Database:** PostgreSQL (self-hosted in Docker, or a managed Postgres like Neon/Supabase DB if you want backups/failover handled for you — still fine since you're not using their auth/hosting, just the DB).
- **ORM:** Prisma — type-safe queries, first-class migrations (required per AGENTS.md rule #8).
- **Caching / rate limiting / jobs:** Redis — powers rate limiting (voting, opinion posting), trending-score caching, and as a queue backend.
- **Background jobs:** BullMQ on top of Redis for: trending-score recomputation, daily analytics snapshotting, moderation digest jobs. A simple cron (node-cron or system cron hitting an internal endpoint) is enough at MVP scale — don't over-engineer this early.
- **Object storage:** Cloudflare R2 (S3-compatible, no egress fees, works with any S3 SDK) for entity images/cover images. Avoids vendor lock-in and keeps things self-hostable in spirit.

### Auth
- **Auth.js (NextAuth)** self-hosted with Credentials (email/password) + Google OAuth provider, session stored in Postgres via the Prisma adapter. Avoids depending on Clerk/Supabase-hosted auth, keeps everything in your own DB, and matches "browsing before auth, contextual auth without losing draft" requirement in the brief (store pending vote in sessionStorage/cookie, resume after login).

### Observability
- **Error monitoring:** Sentry (self-hosted or their free tier — either works fine on any host).
- **Product analytics:** PostHog (can self-host later; their cloud free tier is fine to start and requires no Vercel dependency).
- **Uptime monitoring:** Better Stack or UptimeRobot hitting a `/health` endpoint.
- **Logs:** structured JSON logs via pino, shipped to your host's log driver or a log sink (e.g. Better Stack Logs) if you want searchability.

### Infra / Deployment (your own domain, no Vercel)
- **Containerization:** Docker. One image for the Next.js app (standalone output mode), Postgres + Redis as separate containers (or managed services if you prefer not to operate stateful services yourself).
- **Host:** A VPS (Hetzner, DigitalOcean, or similar) running Docker Compose. This gives full control, predictable pricing, and no platform lock-in.
- **Reverse proxy / TLS:** Caddy (automatic Let's Encrypt certs, trivial config) or Nginx + certbot in front of the app container.
- **DNS:** Point your domain's A/AAAA record at the VPS IP (or via Cloudflare proxy for CDN + DDoS protection + easy cert management).
- **CI/CD:** GitHub Actions — on push to `main`: run tests/lint → build Docker image → push to a registry (GHCR) → SSH into the VPS and `docker compose pull && up -d` (or use a lightweight deploy webhook like Watchtower/CapRover if you want less manual SSH scripting).
- **Backups:** scheduled `pg_dump` to R2/S3 via a cron container.

This stack deliberately avoids microservices — it's one Next.js app, one Postgres, one Redis, deployed as three containers behind a reverse proxy.

---

## 2. Suggested Data Model (maps directly to brief §28–29)

`User`, `Entity`, `Category`, `Tag`, `Opinion`, `OpinionRevision`, `Reply`, `Reaction`, `EntityStatus`, `TimelineEvent`, `EntityFollow`, `EntityRequest`, `Report`, `SourceReference`, `EntityRelationship`, `AnalyticsSnapshot` — implemented as Prisma models with migrations from day one. Aggregates (sentiment %, participant counts, trending score) computed server-side only, never trusted from client input, per brief §30–31.

---

## 3. Phased Roadmap

### Phase 1 — Foundation (~1–2 weeks)
- Next.js + TypeScript + Tailwind scaffold, repo conventions, lint/format/test setup.
- Postgres + Prisma schema for `User`, base auth tables; Redis provisioned.
- Auth.js with email/password + Google OAuth, session persistence.
- Docker Compose for local dev matching prod topology.
- VPS provisioned, Caddy + domain + HTTPS working end-to-end with a "hello world" deploy.
- GitHub Actions CI (lint, typecheck, test) + CD (build/push/deploy).
- Sentry + PostHog wired in from the start.

### Phase 2 — Entity System (~2 weeks)
- `Entity`, `Category`, `Tag`, `EntityStatus`, `TimelineEvent`, `SourceReference` models + migrations.
- Public entity page (header, description, status, timeline) and entity cards.
- Admin-only entity CRUD (behind role check), image upload to R2.

### Phase 3 — Opinion System (~2 weeks)
- `Opinion`, `OpinionRevision`, `Reply`, `Reaction`, `Report` models.
- Vote + optional written opinion submission, one-active-vote-per-user-per-entity logic, edit/update flow with revision history.
- Contextual auth: unauthenticated vote/draft preserved through login redirect.
- Rate limiting (Redis) on vote/opinion/reply endpoints; basic profanity/spam filtering.

### Phase 4 — Analytics (~1–2 weeks)
- Server-side aggregation: sentiment distribution, participant counts, daily trend, participation trend.
- `AnalyticsSnapshot` precomputation job (BullMQ/cron) so dashboard reads are fast.
- Recharts components for distribution + trend, with sample-size always shown per brief §5.5.

### Phase 5 — Discovery (~1–2 weeks)
- Landing page: viral strip, trending/most-discussed/most-polarizing/recently-updated sections, entity cards.
- Trending-score job (configurable weighting per brief §31) recomputed on a schedule.
- Search (Postgres full-text search or `pg_trgm` — no need for Elasticsearch/Algolia at this scale) + category filters.

### Phase 6 — Admin & Moderation (~1–2 weeks)
- Full admin panel: entity management, status/timeline updates, report review queue, content hide/remove, user suspension, entity-request review, featuring.

### Phase 7 — Private Beta (~ongoing)
- Seed 20–50 curated entities in your chosen launch vertical.
- Recruit pilot users, monitor the brief's §26 success metrics via PostHog dashboards, iterate.

**Rough total to a private-beta-ready MVP: ~10–12 weeks solo**, assuming steady focused work and no major scope creep beyond brief §22/§23.

---

## 4. Why this avoids Vercel specifically

- Next.js `output: 'standalone'` runs as a plain Node server in a container — no dependency on Vercel's edge/build pipeline.
- Image optimization: either self-host via `next/image` with a custom loader pointed at R2, or use `sharp` at upload time — avoids Vercel's image API.
- Cron/queue jobs run via BullMQ workers in your own container instead of Vercel Cron/Edge Functions.
- TLS, routing, and scaling are your reverse proxy's job (Caddy/Nginx) instead of Vercel's platform layer.

---

## 5. Next Steps

1. Confirm VPS provider and size (a $12–24/mo box is plenty for MVP-scale traffic).
2. Confirm domain registrar/DNS management (Cloudflare recommended if not already).
3. Scaffold Phase 1 in the repo.
