# Deployment runbook — Neon → Render → Vercel

> Prep-only document. No deploy step here was executed by Claude Code — every command and
> click below is for you to run. Nothing in this file contains a real secret.

---

## 0. Architecture recap

```
Browser  ──────────────►  Vercel (Next.js, apps/web)
                                │
                                │  NEXT_PUBLIC_API_URL (build-time env)
                                ▼
                          Render (Express, apps/api)  ◄──── DATABASE_URL ────  Neon (Postgres)
                                │
                                └── STORAGE_DRIVER=cloudinary ──► Cloudinary (file uploads)
```

Two different origins (`*.vercel.app` and `*.onrender.com`) means every auth-cookie and CORS
decision in the code is a **cross-site** one, not same-site. That's the one thing to keep in
your head through all of this — Section 2 shows exactly where that's already handled.

---

## 1. Environment variables — exact list per service

### 1a. Neon (database)

Neon itself needs no env vars from you — you're just generating a connection string that
the *other two* services consume. See §4 for the pooled-vs-direct nuance.

### 1b. Render (API service — `apps/api`)

Every var below is read by `apps/api/src/config/env.ts`, which **fails startup loudly**
(`process.exit(1)`) if a required one is missing or malformed — so a bad Render env config
shows up immediately in the deploy logs, not as a silent runtime bug.

| Variable | Required | Value for prod | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Neon connection string | See §4 — use the **direct** (non-pooled) string, not the `-pooler` one |
| `PORT` | — | *(leave unset)* | Render injects its own `PORT`; the app already reads `process.env.PORT` via `env.ts`. Don't hardcode 3001. |
| `NODE_ENV` | ✅ | `production` | Flips on HSTS (`app.ts`) and disables `tsx watch` in favor of the compiled `dist/server.js` (`docker-entrypoint.sh`) |
| `CLIENT_URL` | ✅ | `https://<your-project>.vercel.app` | **No trailing slash.** Comma-separate if you need more than one origin (e.g. a preview URL). This is both the CORS allowlist and the email-link base URL. |
| `COOKIE_SAMESITE` | ✅ | `None` | Cross-site cookie — see §2 |
| `JWT_SECRET` | ✅ | random ≥32 chars | `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | — | `15m` | default is fine |
| `REFRESH_TOKEN_SECRET` | ✅ | random ≥32 chars, **different from `JWT_SECRET`** | `openssl rand -hex 64` |
| `REFRESH_TOKEN_EXPIRES_IN` | — | `7d` | default is fine |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` / `SMTP_FROM` | — | your real SMTP provider (or leave `SMTP_USER`/`SMTP_PASS` blank) | If `SMTP_USER`/`SMTP_PASS` are blank, `email.service.ts` falls back to an auto-provisioned **Ethereal** test inbox and logs a preview URL — real emails never send. Fine for a demo, but reviewers won't receive real verification/reset emails. |
| `STORAGE_DRIVER` | ✅ | `cloudinary` | **Not optional in prod** — see §4 |
| `UPLOAD_DIR` | — | irrelevant when `STORAGE_DRIVER=cloudinary` | only used by `LocalStorageService` |
| `CLOUDINARY_CLOUD_NAME` | ✅ if `STORAGE_DRIVER=cloudinary` | from Cloudinary dashboard | |
| `CLOUDINARY_API_KEY` | ✅ if `STORAGE_DRIVER=cloudinary` | from Cloudinary dashboard | |
| `CLOUDINARY_API_SECRET` | ✅ if `STORAGE_DRIVER=cloudinary` | from Cloudinary dashboard | **secret** — Render "secret" env var, never logged |

### 1c. Vercel (web service — `apps/web`)

| Variable | Required | Value for prod | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | `https://<your-api>.onrender.com` | **No trailing slash.** Baked in at build time (`NEXT_PUBLIC_*` vars are inlined into the client bundle) — changing it means a **redeploy**, not just a dashboard edit. Consumed by `apps/web/src/lib/api.ts` and `TaskAttachments.tsx`. |

Vercel project settings (not env vars, but needed once):
- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js (auto-detected)
- Install/Build commands: leave on Vercel's defaults — it detects the `pnpm-workspace.yaml` at
  the true repo root automatically and runs install from there even with Root Directory set
  to a subfolder. You don't need a `vercel.json`.

---

## 2. Cross-site cookie + CORS — confirmed, and where it lives

Yes — the code is already set up for `vercel.app` ↔ `onrender.com`. Three pieces, three files:

**a) Refresh cookie — `apps/api/src/utils/cookies.ts`**
```ts
export function refreshCookieOptions(): CookieOptions {
  const sameSite = env.COOKIE_SAMESITE.toLowerCase() as 'strict' | 'lax' | 'none'
  const isCrossSite = sameSite === 'none'
  return {
    httpOnly: true,
    secure: isCrossSite || env.NODE_ENV === 'production',
    sameSite,
    path: '/api/v1/auth',
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    ...(isCrossSite ? { partitioned: true } : {}),
  }
}
```
Setting `COOKIE_SAMESITE=None` on Render automatically turns on `Secure` and `Partitioned`
(CHIPS — needed so the cookie survives Chrome's third-party-cookie phase-out). This is driven
entirely by the `COOKIE_SAMESITE` env var from §1b — no code change needed, just set the var.

**b) CORS allowlist — `apps/api/src/app.ts`**
```ts
const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim())
app.use(cors({ origin: allowedOrigins, credentials: true }))
```
`credentials: true` is what allows the browser to send/receive the cookie cross-site at all;
without it the cookie would be silently dropped even with `SameSite=None`. Driven by
`CLIENT_URL` from §1b.

**c) Frontend must ask for credentials too — `apps/web/src/lib/api.ts`**
```ts
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
})
```
This is already in the code and needs no env var — flagging it only so you know it's the
third leg of the same stool, not something Vercel's dashboard configures.

**Residual CSRF exposure**: `SameSite=None` does reopen a CSRF surface that `Strict`/`Lax`
close automatically. The mitigations already in place (documented in `docs/ARCHITECTURE.md`
once Phase 6 lands, and in the PLAN.md decision log now): 15-minute access token lifetime,
refresh-token rotation with reuse detection, and the CORS origin allowlist itself (a
non-allowlisted site can't read the API's responses even if it could trigger a request).

---

## 3. Deploy runbook — strict order

Each step assumes you're clicking through the provider's dashboard. Do not skip the order —
Render needs Neon's URL before it can boot; Vercel needs Render's URL before its build is
useful; and Render needs Vercel's *real* URL before login will work end-to-end.

### Step 1 — Neon

1. Create a Neon project (any region close to your Render region choice, to cut latency).
2. Create the production database (Neon's default `neondb` is fine, or name it `taskflow`).
3. From the Neon dashboard, copy **two** connection strings (Neon's UI labels them):
   - **Pooled connection** (hostname contains `-pooler`) — not used by this app, see §4.
   - **Direct connection** (no `-pooler`) — this is your `DATABASE_URL` for Render.
4. Keep this tab open; you'll paste the direct string into Render in Step 2.

### Step 2 — Render (API)

1. New → Web Service → connect this GitHub repo.
2. Runtime: **Docker**. Dockerfile path: `apps/api/Dockerfile`. Docker build context: repo
   root (`.`) — the Dockerfile's first line says as much; Render's "Root Directory" field
   should be left as the repo root, not `apps/api`, because the build needs
   `packages/types` alongside it.
3. Instance type: Free is fine for a demo (see §4 for the cold-start cost of that).
4. Add every env var from §1b. Paste Neon's **direct** connection string as `DATABASE_URL`.
   For `CLIENT_URL`, you don't have the Vercel URL yet — put in a placeholder
   (`https://placeholder.vercel.app`) and plan to come back and fix it in Step 4. Everything
   else can be final now.
5. Deploy. Watch the logs — `docker-entrypoint.sh` runs automatically on boot and does all
   three of these in order, every single time the container starts:
   ```
   [entrypoint] generating Prisma client...
   [entrypoint] applying migrations...      ← prisma migrate deploy
   [entrypoint] seeding database...          ← tsx prisma/seed.ts
   [entrypoint] starting server...
   ```
   **This is also your answer for "how do I seed the production DB so demo logins work"** —
   you don't do anything extra. `seed.ts` checks for an existing `ADMIN` user first and prints
   `Database already seeded — skipping.` if found, so this is safe to run on every redeploy
   and every free-tier cold-start wake, not just the first boot.
6. Once it's live, hit `https://<your-api>.onrender.com/api/health` — should return the
   standard envelope with `"status":"ok"`. Keep this URL for Step 3.

### Step 3 — Vercel (web)

1. New Project → import this repo.
2. Set **Root Directory** to `apps/web` (see §1c for why no `vercel.json` is needed).
3. Add `NEXT_PUBLIC_API_URL` = the Render URL from Step 2, no trailing slash.
4. Deploy. Note the resulting **Production** domain (the stable `<project>.vercel.app` one,
   not a deployment-specific hash URL — those look like `<project>-<hash>-<team>.vercel.app`
   and change per deploy).

### Step 4 — Wire the URLs back together

1. Back in Render → your API service → Environment: replace the `CLIENT_URL` placeholder with
   the real Vercel Production domain from Step 3. Save → Render redeploys automatically.
2. Confirm the Render logs show a clean boot again (migrate/seed both no-op on this redeploy
   since nothing schema-related changed).
3. Open the Vercel URL in a browser, log in with a demo account from the table below, and
   confirm the dashboard loads. If login silently fails or you see a CORS error in devtools,
   it's almost always `CLIENT_URL` not exactly matching what's in the browser's address bar
   (scheme, trailing slash, or a preview-URL vs. production-URL mismatch).

### Step 5 — Demo accounts (already seeded, no action needed)

| Role | Email | Password |
|---|---|---|
| Admin | sarah@taskflow.dev | Password123! |
| Project Manager | james@taskflow.dev | Password123! |
| Team Member | aisha@taskflow.dev | Password123! |

(Same table as the README — repeated here so this doc is self-contained.)

---

## 4. What will bite you

1. **Render free-tier cold start (~50s).** The instance spins down after ~15 min idle and a
   full container boot (not just a process wake) runs on the next request — which means
   `docker-entrypoint.sh`'s migrate-deploy-and-seed sequence reruns too. Both are safe no-ops
   by then, but they still add a couple of seconds on top of the cold boot itself. The
   README already has a live-demo note warning reviewers about this; don't remove it.

2. **Neon's pooled connection string will break `prisma migrate deploy`.** Neon gives you two
   strings: a **pooled** one (hostname has `-pooler`, routed through PgBouncer in transaction
   mode) meant for app runtime queries at scale, and a **direct** one for anything using
   prepared statements or session-level features — which includes Prisma's migration engine.
   `docker-entrypoint.sh` runs `prisma migrate deploy` and the app server from the *same*
   `DATABASE_URL`, and `schema.prisma` has no `directUrl` split configured. **For this app's
   scale (free-tier, single instance, demo traffic), the simplest safe fix is: use Neon's
   direct connection string as `DATABASE_URL` and skip pooling entirely** — that's what §3
   Step 1 has you copy. If you'd rather use the pooled string for runtime queries (worth doing
   if this ever needs to handle real concurrent load), tell me and I'll add
   `directUrl = env("DIRECT_URL")` to the `datasource` block in `schema.prisma` and split the
   two env vars — that's a real schema change, so I didn't make it unprompted.

3. **Cloudinary env vars are load-bearing on Render, not optional.** Render's free-tier web
   service disk is ephemeral — anything `LocalStorageService` writes to `UPLOAD_DIR` vanishes
   on the next restart/redeploy/cold-start wake. `STORAGE_DRIVER=cloudinary` plus all three
   `CLOUDINARY_*` vars are effectively required for attachment uploads to survive past the
   current process. `services/storage/index.ts` already throws a loud startup error if
   `STORAGE_DRIVER=cloudinary` is set without all three Cloudinary vars present — so a
   misconfiguration here fails fast in the logs rather than silently losing files later.

4. **`CLIENT_URL` needs the *real*, *final* Vercel domain, exact string.** The `cors` package
   does exact origin matching against `CLIENT_URL`'s comma-split list — not a wildcard, not a
   prefix match. A trailing slash, `http` vs `https`, or pointing at a deployment-hash preview
   URL instead of the stable Production domain will all silently fail CORS (the browser blocks
   the response; Network tab shows the request went out but the app never sees the data). If
   you ever test against a Vercel *preview* deployment (a PR branch, not Production), that
   preview gets its own unique origin — add it to `CLIENT_URL` as a second comma-separated
   entry only if you need that specific preview to talk to this same Render API.

---

## 5. Optional: Render Blueprint (`render.yaml`)

A `render.yaml` at the repo root lets you skip most of Step 2's manual field-filling via
Render's "New → Blueprint Instance" flow. It's optional — the manual dashboard path in §3
works fine without it. See `render.yaml` in the repo root; every secret field in it is
`sync: false` (Render prompts you for the value at blueprint-creation time — nothing is
committed) or `generateValue: true` (Render generates it for you). You still need to fill in
`DATABASE_URL`, `CLIENT_URL`, and the three `CLOUDINARY_*` vars by hand either way.
