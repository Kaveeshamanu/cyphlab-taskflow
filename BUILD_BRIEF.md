# Build Brief — Project & Team Task Management Platform

> **How to use this file**
> 1. Put this file and `CLAUDE.md` in your repo root.
> 2. Run `claude` in that folder.
> 3. Paste the **KICKOFF PROMPT** (Section 0) as your first message.
> 4. Then work through the phase prompts one at a time — **never paste the whole file as one prompt.**
> 5. **You handle every git operation yourself.** Claude Code writes code; you review the diff, commit, and push.

---

## 0. KICKOFF PROMPT (paste this first)

```
Read CLAUDE.md and BUILD_BRIEF.md in the repo root. This is a 5-day job-application
take-home that I am being graded on, and I will be interviewed on the code. Read both
files fully before writing anything.

Then do ONLY this, and stop:
1. Ask me any clarifying questions.
2. Propose the full monorepo structure (folder tree).
3. Propose the complete database schema as a Mermaid ERD.
4. Propose the phase-by-phase build order.

Write your plan to PLAN.md. Do not write application code yet.
Wait for my approval before starting Phase 1.

Reminder of the rules in CLAUDE.md: you never run git commands, you never add AI
attribution anywhere, you do one phase per turn, and you stop at the end of each phase.
```

---

## 1. Project context

Applying for an **Intern Full Stack Developer** role at CyphLab (Private) Limited. This is the graded practical assignment. **5 days.** Shortlisting is competitive, so the submission must be *complete, running, tested and documented* — not a half-finished app with many broken features.

**A working, deployed, tested app with 10 solid features beats a broken app with 25.**

### Graded on (their words)
- Completion of required features
- Code quality and project structure
- Authentication and role-based authorization
- Database design and relationships
- Frontend usability and responsiveness
- API design and validation
- Git usage and commit history
- Basic testing and CI/CD implementation
- Documentation and **ability to explain the submitted work**

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** |
| Styling | **Tailwind CSS + shadcn/ui** |
| State/data | **TanStack Query** (server state) + **Zustand** (UI state only) |
| Forms | **react-hook-form + Zod** |
| Charts | **Recharts** |
| Drag & drop | **@dnd-kit/core** |
| Backend | **Node.js + Express + TypeScript** |
| ORM | **Prisma** |
| Database | **PostgreSQL** |
| Auth | **JWT access token (15 min, in memory) + refresh token (7 days, httpOnly Secure SameSite cookie, rotated on use)** |
| Validation | **Zod** on every request body/query/param |
| API docs | **Swagger / OpenAPI** (`swagger-jsdoc` + `swagger-ui-express`) → also export a Postman collection |
| Testing | **Vitest + Supertest** (backend), **Vitest + Testing Library** (frontend, light) |
| Email | **Nodemailer** — Ethereal in dev, Resend in prod |
| File storage | Local disk in dev, **Cloudinary** in prod (abstract behind a `StorageService` interface) |
| Realtime | **Socket.io** — stretch goal only |
| Containers | **Docker + Docker Compose** |
| CI | **GitHub Actions** |
| Deploy | Frontend → **Vercel**, Backend → **Railway/Render**, DB → **Neon/Supabase** |

**Monorepo layout:**
```
/apps/web        → Next.js
/apps/api        → Express + Prisma
/packages/types  → shared TS types + Zod schemas (single source of truth)
docker-compose.yml
.github/workflows/ci.yml
```

---

## 3. Domain model

**Entities:** `User`, `Role`, `Project`, `ProjectMember`, `Task`, `Comment`, `Attachment`, `Notification`, `ActivityLog`, `Tag`, `TaskTag`, `RefreshToken`

**Key relationships (DB design is explicitly graded — get these right):**
- `User` — `Role`: many-to-one (`ADMIN` | `PROJECT_MANAGER` | `TEAM_MEMBER`)
- `Project` — `User` (manager): many-to-one
- `Project` — `User` (members): many-to-many via **`ProjectMember`** join table (with `joinedAt`)
- `Task` — `Project`: many-to-one, cascade delete
- `Task` — `User` (assignee): many-to-one, nullable
- `Task` — `Task` (parent): **self-referencing** FK for subtasks
- `Comment` — `Task`, `Comment` — `User` (author)
- `Comment` — `User` (mentions): many-to-many
- `Attachment` — `Task`, `Attachment` — `User` (uploader)
- `Task` — `Tag`: many-to-many via `TaskTag`
- `ActivityLog`: `entityType`, `entityId`, `action`, `actorId`, `metadata` (JSON), `createdAt`
- **Soft delete** (`deletedAt`) on `Project`, `Task`, `Comment`, `User`
- Every table: `id` (cuid), `createdAt`, `updatedAt`
- Indexes on all FKs, plus `Task.status`, `Task.dueDate`, `User.email` (unique)

**Task fields:** `title`, `description`, `status` (`TODO | IN_PROGRESS | IN_REVIEW | DONE`), `priority` (`LOW | MEDIUM | HIGH | URGENT`), `dueDate`, `position` (float, for Kanban ordering), `projectId`, `assigneeId`, `parentTaskId`

---

## 4. Permission matrix (implement EXACTLY this, server-side)

| Action | Admin | Project Manager | Team Member |
|---|---|---|---|
| CRUD any user / assign roles | ✅ | ❌ | ❌ |
| View all projects | ✅ | ❌ (own only) | ❌ (assigned only) |
| Create project | ✅ | ✅ | ❌ |
| Edit / delete project | ✅ | ✅ *(own only)* | ❌ |
| Add / remove project members | ✅ | ✅ *(own only)* | ❌ |
| Create / edit / delete task | ✅ | ✅ *(own projects)* | ❌ |
| Assign task to a user | ✅ | ✅ *(own projects)* | ❌ |
| Update task **status** | ✅ | ✅ | ✅ *(only tasks assigned to them)* |
| Comment / upload attachment | ✅ | ✅ | ✅ *(on projects they're in)* |
| View audit log | ✅ | ❌ | ❌ |
| Restore soft-deleted items | ✅ | ❌ | ❌ |

Two layers of guard:
1. `requireRole(...roles)` — coarse, role-only.
2. `requireProjectAccess(level)` — **ownership/membership check against the DB.** A PM must not be able to touch another PM's project just because they hold the PM role.

> This is the single most common failure in take-homes. Get it right, prove it with tests, and point at it in your video.

---

## 5. Build phases

**One phase per Claude Code turn.** At the end of each phase Claude Code stops and summarises. **Then you** review the diff, commit, and push.

### Phase 1 — Foundation (Day 1)
- Monorepo scaffold, TypeScript strict mode everywhere
- ESLint + Prettier
- `docker-compose.yml`: `web`, `api`, `postgres` — **`docker compose up` must boot the whole stack with zero manual steps**
- Prisma schema (full model from §3) + migrations
- Seed script: 1 Admin, 3 PMs, 8 Team Members, 5 projects, ~60 tasks across all statuses/priorities, comments, tags, activity entries. **Realistic names — not `test1`/`test2`.**
- `.env.example`, fully populated
- **You commit:** `chore: scaffold monorepo, docker, prisma schema and seeds`

### Phase 2 — Auth & RBAC (Day 1–2)
- Register, login, logout, refresh, forgot-password, reset-password, verify-email
- Argon2 password hashing
- Access token (15 min, returned in body, held in memory client-side)
- Refresh token (7 days, **httpOnly + Secure + SameSite=Strict cookie**, **rotated on every use**, revoked on logout, stored hashed in `RefreshToken`)
- Rate limit: 5 attempts / 15 min on `/auth/login` and `/auth/forgot-password`
- `helmet`, CORS allowlist, request-id middleware
- `requireAuth`, `requireRole`, `requireProjectAccess`
- **Global error handler + standard envelope on EVERY response:**
  ```ts
  { success: boolean, data: T | null, message: string, errors: FieldError[] | null }
  ```
- **You commit:** `feat(auth): jwt auth with refresh rotation and rbac middleware`

### Phase 3 — Core API (Day 2)
All routes Zod-validated, OpenAPI-annotated, guarded.

```
POST   /api/v1/auth/*                    (Phase 2)
GET    /api/v1/users                     admin        ?search&role&page&limit
POST   /api/v1/users                     admin
PATCH  /api/v1/users/:id                 admin
PATCH  /api/v1/users/:id/role            admin
DELETE /api/v1/users/:id                 admin        (soft)
GET    /api/v1/projects                  scoped by role
POST   /api/v1/projects                  admin, pm
GET    /api/v1/projects/:id              member+
PATCH  /api/v1/projects/:id              owner pm, admin
DELETE /api/v1/projects/:id              owner pm, admin   (soft)
POST   /api/v1/projects/:id/members      owner pm, admin
DELETE /api/v1/projects/:id/members/:uid owner pm, admin
GET    /api/v1/tasks                     ?projectId&status&priority&assigneeId&tag
                                         &dueBefore&dueAfter&search&sort&page&limit
POST   /api/v1/tasks                     owner pm, admin
GET    /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id                 owner pm, admin
PATCH  /api/v1/tasks/:id/status          assignee, owner pm, admin
PATCH  /api/v1/tasks/:id/position        (kanban reorder)
DELETE /api/v1/tasks/:id                 owner pm, admin   (soft)
GET    /api/v1/tasks/:id/comments
POST   /api/v1/tasks/:id/comments        project member+   (parses @mentions)
POST   /api/v1/tasks/:id/attachments     project member+   (multer, 5MB, mime allowlist)
DELETE /api/v1/attachments/:id
GET    /api/v1/notifications             own only
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all
GET    /api/v1/activity                  admin      ?entityType&actorId&from&to
GET    /api/v1/search                    global: projects + tasks + users (role-scoped)
GET    /api/v1/dashboard                 role-specific payload
POST   /api/v1/projects/:id/restore      admin
POST   /api/v1/tasks/:id/restore         admin
GET    /api/v1/export/projects/:id.csv   owner pm, admin
GET    /api/docs                         swagger ui
GET    /api/health
```
- **Audit log:** one Prisma middleware / service hook recording every create/update/delete. Do not scatter logging calls through controllers.
- **Notifications** fire on: task assigned, @mention, comment on your task, status change on your task.
- **Email:** welcome/verify, password reset, task-assigned. Transactional only — **no cron job.**
- **You commit:** `feat(api): projects, tasks, comments, attachments, notifications, audit log`

### Phase 4 — Frontend (Day 3)
- App Router; route groups `(auth)` and `(dashboard)`
- Middleware route protection + role-based nav rendering
- **Design tokens first** (colors, spacing, radii, type scale as CSS vars), then components. **Dark mode via `next-themes` from the start, not bolted on.**
- Screens:
  - Login / Register / Forgot / Reset
  - **Dashboard (role-specific)** — see Phase 5
  - Projects list (cards + filters) and Project detail
  - **Kanban board** (`@dnd-kit`): 4 columns, drag to change status, **optimistic update with rollback on failure**
  - Task list view (table: sort, multi-filter, pagination)
  - Task detail drawer: description, assignee, priority, due date, tags, subtasks, comments (@mention autocomplete), attachments (drag-drop upload with progress)
  - Users admin page (Admin only)
  - Activity log page (Admin only): filterable timeline
  - Notifications bell + dropdown + unread badge
  - Global search (⌘K command palette — `cmdk`)
  - Profile / settings
- **Every** async surface: skeleton → content, or empty state, or error state with retry. No spinner-only states.
- Toasts (`sonner`) on every mutation.
- Responsive: mobile ≥360px, tablet, desktop. Kanban → swipeable single column on mobile.
- Accessibility: keyboard navigable, visible focus rings, ARIA labels, WCAG AA contrast in **both** themes.
- **You commit:** `feat(web): dashboard, kanban, task management, admin console`

### Phase 5 — Dashboards & polish (Day 4)
`GET /dashboard` returns a role-specific payload:
- **Admin:** users by role (donut), projects by status (bar), tasks created/completed last 30 days (line), recent activity feed, system stats
- **PM:** their projects' health, tasks by status (stacked bar), overdue count, team workload by assignee (horizontal bar), upcoming deadlines
- **Team Member:** my open tasks by priority, due this week, my completion rate over time, recent notifications

Then: dark mode QA pass, empty states, 404/500 pages, favicon, meta tags, **deploy and verify the live URL works end to end.**
- **You commit:** `feat(web): role-specific dashboards with charts` and `chore: production deployment`

### Phase 6 — Tests, CI, docs (Day 5)

**Tests — this is where competitors will have nothing. Do not skip.**
- Auth: register, login, wrong password, refresh rotation, **reuse of a rotated token is rejected**, rate limiting
- **RBAC (the money tests):**
  - Team Member `POST /tasks` → **403**
  - Team Member `GET /users` → **403**
  - PM editing another PM's project → **403**
  - PM adding a member to a project they don't own → **403**
  - Team Member updating status of a task not assigned to them → **403**
  - Unauthenticated request to any protected route → **401**
- Validation: bad payload → 422 with field-level `errors` array
- Task lifecycle: create → assign → notification created → status update → activity logged
- Soft delete: deleted task excluded from list, restorable by admin only
- Frontend: a few Testing Library tests (auth form, Kanban column)

**CI — `.github/workflows/ci.yml`.** *(Claude Code must show you the file and get your approval before creating anything in `.github/`.)*
```
on: [push, pull_request]
jobs:
  quality:
    - checkout, setup node, cache pnpm
    - install
    - lint (eslint)
    - typecheck (tsc --noEmit)
  test:
    services: postgres:16
    - prisma migrate deploy
    - vitest run --coverage
    - upload coverage artifact
  build:
    - build api
    - build web
    - docker build (validate Dockerfiles)
```
Add the CI status badge to the README.

**Docs:**
- `README.md`: badges · screenshots · features · tech stack · architecture diagram · **ERD (Mermaid)** · **Use Case diagram (Mermaid)** · quickstart (`docker compose up`) · **demo accounts table with plaintext passwords** · API docs link · testing · CI/CD explanation · AI usage disclosure
- `docs/FEATURE_REPORT.md` — table: Feature | Required/Extra | Status | Notes
- `docs/CICD.md` — what each job does and why
- `docs/ARCHITECTURE.md` — request lifecycle, auth flow diagram, folder rationale
- `postman_collection.json`
- **You commit:** `test: auth, rbac and task lifecycle coverage`, then `docs: readme, diagrams, feature report`

---

## 6. Stretch goals — ONLY if Phase 5 finishes early
In priority order. **Do not start any of these until the core is deployed, tested and documented.**
1. **Socket.io realtime** — Kanban and notifications update live across sessions. Highest wow-factor.
2. **Subtasks / checklist** UI on the task drawer (schema already supports it)
3. **Task dependencies** (blocked-by / blocks) — many-to-many self-join
4. **Time tracking** — estimated vs logged hours, rolled up to project
5. **AI project summary** — `GET /projects/:id/summary` calling the Anthropic API
6. **CSV export** (30 min — do this one first if short on time)

**Explicitly out of scope:** calendar view, PDF export, recurring tasks, multi-tenancy, due-date reminder cron, project templates.

---

## 7. Your git workflow (you, not Claude Code)

After Claude Code finishes each phase:

```bash
git status                       # what changed
git diff                         # READ IT. this is you learning your own codebase.
git checkout -b feat/<phase-name>
git add .
git commit -m "<conventional commit message>"
git push -u origin feat/<phase-name>
```
Then open and merge the PR on GitHub.

**Do not skip `git diff`.** Reading the change before you commit it is what turns "AI wrote it" into "I understand it" — and "ability to explain the submitted work" is a graded criterion. If you can't explain a file, ask Claude Code to walk you through it *before* you commit.

Push at the end of every phase, every day. Steady commits across 5 days read like real work. One giant dump on day 5 does not.

---

## 8. Non-negotiable acceptance criteria

Before submitting, every one of these must be true. Verify them yourself.

- [ ] `git clone && cp .env.example .env && docker compose up` → app fully running with seeded data, **zero manual steps**
- [ ] README lists 3 demo logins (admin / pm / member) that work on the **live deployed URL**
- [ ] Live URL is up; frontend talks to backend; login works there
- [ ] CI is green on `main`, badge in the README proves it
- [ ] Every RBAC rule in §4 is enforced server-side and covered by a passing test
- [ ] No secret or token in the repo; `.env.example` is complete
- [ ] `tsc --noEmit` and `eslint` pass with zero errors on both apps
- [ ] Swagger UI loads at `/api/docs`; every endpoint documented
- [ ] Every list endpoint paginates, filters and sorts
- [ ] Every mutation returns the standard envelope; every 4xx/5xx has a useful message
- [ ] UI usable at 360px; dark mode has no broken contrast
- [ ] ERD, Use Case and Architecture diagrams render in the README
- [ ] **No AI attribution anywhere** in commits, code comments, or PRs
- [ ] Git history: ≥25 conventional commits across feature branches, all authored by **you**
- [ ] `docs/FEATURE_REPORT.md` maps every graded criterion to where it's satisfied
- [ ] **You can explain every file in the repo without opening Claude**

---

## 9. AI usage disclosure (they explicitly ask — be specific and honest)

Draft for the README. Adjust to what's actually true:

> **AI tools used:** Claude Code (Anthropic).
> **What it assisted with:** project scaffolding, boilerplate CRUD controllers, Tailwind/shadcn component wiring, Docker and CI configuration, seed data generation, and test scaffolding.
> **What I designed and wrote myself:** the data model and all entity relationships, the authentication flow (refresh-token rotation, hashing strategy), the role- and ownership-based authorization middleware, and the authorization test suite.
> **Review process:** I reviewed every diff before committing and can explain every design decision in the codebase.

Only write that last line if it's true. Make it true.
