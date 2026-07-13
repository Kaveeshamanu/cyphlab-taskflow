# TaskFlow — Build Plan

> Status: CORRECTIONS APPLIED — awaiting "go" to start Phase 1.
> No application code written yet.

---

## Decisions locked

| Topic | Decision |
|---|---|
| Package manager | pnpm workspaces; `pnpm-lock.yaml` committed |
| API host | Render (free tier, Docker-based deploy; cold-start note in README) |
| Database host | Neon (free Postgres, connection string only) |
| Frontend host | Vercel |
| File storage — dev/Docker | `LocalStorageService` (disk, under `uploads/`) |
| File storage — prod | `CloudinaryStorageService` (free Cloudinary account, credentials in env) |
| StorageService pattern | Interface + two concrete impls; active impl selected by `STORAGE_DRIVER` env var. No call site changes between drivers. |
| Email — dev/tests | Nodemailer + Ethereal (auto-creates test inbox, logs preview URL) |
| Email — prod | Same Nodemailer; SMTP host/port/user/pass from env. Resend is a config swap, not a code change. |
| Password hashing | `@node-rs/argon2` — prebuilt binaries, no node-gyp, works on Alpine without a build toolchain |
| Prisma version | Pinned explicitly (e.g. `"prisma": "5.22.0"`) in `apps/api/package.json` |
| Audit log implementation | Prisma `$extends` query component (NOT deprecated `$use`) + `AsyncLocalStorage` for actor threading |
| Soft delete — filter enforcement | Prisma `$extends` query component injects `deletedAt: null` on `findMany`/`findFirst`. `findUnique` is routed to `findFirst` inside the extension (Prisma only allows unique fields in `findUnique.where`, so injecting `deletedAt` throws). Escape hatch: a second `prismaUnfiltered` client (plain `new PrismaClient()` with no extension) used exclusively by restore endpoints and admin activity log. |
| Soft delete — email uniqueness | Partial unique index on `User.email WHERE "deletedAt" IS NULL` (raw SQL migration). Soft-deleting a user frees their email for re-registration. Tradeoff: if an admin later restores that user and their email was re-claimed, restore returns 409 — admin must update the email first. Documented in `ARCHITECTURE.md`. |
| Cross-site cookie (Vercel ↔ Render) | `SameSite=Strict` breaks cross-site: the browser will not send the cookie from Vercel to Render. Fix: `COOKIE_SAMESITE` env var — `Lax` in dev/Docker (same-origin), `None` in prod. When `None`, also set `Secure` and `Partitioned`. API CORS: `credentials: true` + origin allowlist from env. Axios: `withCredentials: true`. ARCHITECTURE.md documents that `SameSite=None` reopens CSRF exposure and that refresh-token rotation + 15-min access tokens are the mitigation. |
| CSV export | Included in Phase 3 alongside other routes |
| Socket.io | Server instance wired in Phase 3, server-side only. Notification service emits events. No frontend realtime UI unless explicitly authorised after Phase 5. Stop and report if it adds meaningful Phase 3 complexity. |
| CI process | Starts in Phase 1 (quality job only). A new job is added each phase. YAML shown for approval before writing to `.github/`; the Phase 1 YAML is already in this file and approved by the user's "start Phase 1" instruction. |
| Render cold start | Free tier sleeps after ~15 min idle (~50 s cold-start). One-line note at the top of README so a reviewer doesn't think the live link is broken. |

---

## Monorepo structure

```
cyphlab-taskflow/
├── apps/
│   ├── api/                              Express + Prisma + TypeScript
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── env.ts               zod-parsed env (throws on startup if invalid)
│   │   │   ├── db/
│   │   │   │   └── client.ts            Prisma client singleton with $extends (soft-delete + audit)
│   │   │   ├── middlewares/
│   │   │   │   ├── auth.ts              requireAuth — verifies JWT, attaches req.user
│   │   │   │   ├── requireRole.ts       coarse role gate (reads JWT payload, zero DB calls)
│   │   │   │   ├── projectAccess.ts     requireProjectAccess — DB ownership/membership check
│   │   │   │   ├── errorHandler.ts      global error → standard envelope
│   │   │   │   ├── rateLimiter.ts       express-rate-limit instances
│   │   │   │   ├── requestId.ts         uuid per request (X-Request-ID header)
│   │   │   │   └── validate.ts          Zod schema validator factory (body/query/params)
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.schemas.ts
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.router.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   └── users.schemas.ts
│   │   │   │   ├── projects/
│   │   │   │   ├── tasks/
│   │   │   │   ├── comments/
│   │   │   │   ├── attachments/
│   │   │   │   ├── notifications/
│   │   │   │   ├── activity/
│   │   │   │   ├── search/
│   │   │   │   ├── dashboard/
│   │   │   │   └── export/
│   │   │   ├── services/
│   │   │   │   ├── email/
│   │   │   │   │   ├── email.service.ts      Nodemailer impl (Ethereal dev / SMTP prod)
│   │   │   │   │   └── templates/            plain-text + HTML email templates
│   │   │   │   └── storage/
│   │   │   │       ├── storage.service.ts    IStorageService interface
│   │   │   │       ├── local.storage.ts      LocalStorageService (dev / Docker)
│   │   │   │       └── cloudinary.storage.ts CloudinaryStorageService (prod)
│   │   │   ├── utils/
│   │   │   │   ├── envelope.ts          ok() / fail() response factory
│   │   │   │   ├── pagination.ts        parsePagination, buildMeta
│   │   │   │   ├── actorContext.ts      AsyncLocalStorage — threads actorId into Prisma extension
│   │   │   │   └── mentions.ts          @mention parser for comment bodies
│   │   │   ├── openapi/
│   │   │   │   └── swagger.ts           swagger-jsdoc config + swagger-ui-express mount
│   │   │   ├── socket/
│   │   │   │   └── socket.server.ts     socket.io instance; emits notification events server-side
│   │   │   ├── app.ts                   Express app factory (no listen — for testability)
│   │   │   └── server.ts                listen entrypoint
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── tests/
│   │   │   ├── helpers/
│   │   │   │   ├── db.ts                test DB setup/teardown
│   │   │   │   └── tokens.ts            access/refresh token factory for tests
│   │   │   ├── auth.test.ts
│   │   │   ├── rbac.test.ts
│   │   │   └── tasks.test.ts
│   │   ├── uploads/                     .gitignored; mounted as Docker volume
│   │   ├── Dockerfile
│   │   ├── tsconfig.json                extends ../../tsconfig.base.json, strict
│   │   ├── vitest.config.ts
│   │   └── package.json
│   │
│   └── web/                             Next.js 15 App Router + TypeScript
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── register/page.tsx
│       │   │   │   ├── forgot-password/page.tsx
│       │   │   │   ├── reset-password/[token]/page.tsx
│       │   │   │   └── verify-email/[token]/page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── layout.tsx            sidebar + header shell
│       │   │   │   ├── dashboard/page.tsx    role-aware, delegates to role component
│       │   │   │   ├── projects/
│       │   │   │   │   ├── page.tsx          project list (cards + filters)
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── page.tsx      project detail
│       │   │   │   │       ├── kanban/page.tsx
│       │   │   │   │       └── tasks/page.tsx
│       │   │   │   ├── tasks/page.tsx        global task list (table view)
│       │   │   │   ├── users/page.tsx        Admin only
│       │   │   │   ├── activity/page.tsx     Admin only
│       │   │   │   ├── notifications/page.tsx
│       │   │   │   └── profile/page.tsx
│       │   │   ├── layout.tsx               root layout (providers, theme)
│       │   │   ├── not-found.tsx
│       │   │   ├── error.tsx
│       │   │   └── page.tsx                 redirect → /dashboard
│       │   ├── components/
│       │   │   ├── ui/                      shadcn/ui primitives (generated, not hand-written)
│       │   │   ├── layout/
│       │   │   │   ├── Sidebar.tsx          role-aware nav links
│       │   │   │   ├── Header.tsx
│       │   │   │   └── NotificationBell.tsx bell + dropdown + unread badge
│       │   │   ├── kanban/
│       │   │   │   ├── KanbanBoard.tsx      dnd-kit DndContext
│       │   │   │   ├── KanbanColumn.tsx     SortableContext per status
│       │   │   │   └── KanbanCard.tsx       draggable task card
│       │   │   ├── task/
│       │   │   │   ├── TaskDrawer.tsx       full task detail (all fields, comments, attachments)
│       │   │   │   ├── TaskTable.tsx        list view with sort + filter + pagination
│       │   │   │   └── TaskFilters.tsx
│       │   │   ├── project/
│       │   │   │   ├── ProjectCard.tsx
│       │   │   │   └── ProjectFilters.tsx
│       │   │   ├── dashboard/
│       │   │   │   ├── AdminDashboard.tsx
│       │   │   │   ├── PMDashboard.tsx
│       │   │   │   └── MemberDashboard.tsx
│       │   │   ├── command/
│       │   │   │   └── CommandPalette.tsx   ⌘K global search (cmdk)
│       │   │   └── shared/
│       │   │       ├── DataTable.tsx
│       │   │       ├── EmptyState.tsx
│       │   │       ├── ErrorState.tsx       with retry button
│       │   │       └── SkeletonCard.tsx
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useTasks.ts
│       │   │   ├── useProjects.ts
│       │   │   └── useNotifications.ts
│       │   ├── lib/
│       │   │   ├── api.ts               axios instance; interceptor handles 401 → silent refresh
│       │   │   └── utils.ts             cn(), date helpers
│       │   ├── providers/
│       │   │   ├── QueryProvider.tsx    TanStack Query client
│       │   │   └── ThemeProvider.tsx    next-themes
│       │   ├── stores/
│       │   │   └── authStore.ts         Zustand — access token in memory only (never localStorage)
│       │   └── middleware.ts            Next.js edge middleware — redirect unauthenticated users
│       ├── public/
│       ├── Dockerfile
│       ├── tsconfig.json                extends ../../tsconfig.base.json, strict
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   └── types/                           shared TS types + Zod schemas — single source of truth
│       ├── src/
│       │   ├── schemas/
│       │   │   ├── auth.schemas.ts
│       │   │   ├── user.schemas.ts
│       │   │   ├── project.schemas.ts
│       │   │   ├── task.schemas.ts      includes MoveTaskSchema { status?, position? }
│       │   │   ├── comment.schemas.ts
│       │   │   └── common.schemas.ts    pagination, sort, envelope
│       │   └── types/
│       │       ├── api.types.ts         ApiResponse<T>, PaginatedResponse<T>
│       │       ├── enums.ts             Role, TaskStatus, Priority, ProjectStatus, NotifType
│       │       └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── FEATURE_REPORT.md
│   ├── CICD.md
│   └── ARCHITECTURE.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                       grown incrementally — YAML approved before each addition
│
├── docker-compose.yml                   postgres + api + web; health-checks; upload volume
├── docker-compose.override.yml          dev overrides (bind-mounts for hot-reload)
├── .env.example                         every variable documented; no defaults for secrets
├── .eslintrc.js
├── .prettierrc
├── pnpm-workspace.yaml
├── tsconfig.base.json                   base strict config extended by each app
├── PLAN.md                              ← this file
├── BUILD_BRIEF.md
├── CLAUDE.md
└── README.md
```

### Key structural decisions (interview-ready rationale)

| Decision | Why |
|---|---|
| Module-per-feature in `apps/api/src/modules/` | Each module owns its router, controller, service, and schemas. No file exceeds ~250 lines. Blame-by-module is clean. |
| `packages/types` as single source of truth | Zod schemas live once. API imports them for validation; web imports them for form schemas and `z.infer<>`. Zero drift between layers. |
| `IStorageService` + env-selected impl | `STORAGE_DRIVER=local` → `LocalStorageService`; `STORAGE_DRIVER=cloudinary` → `CloudinaryStorageService`. Controllers call `storageService.upload(file)` with no knowledge of destination. Swapping is a config change, not a code change. |
| `app.ts` vs `server.ts` split | `app.ts` exports the Express app without calling `listen()`. Tests import it directly via `supertest(app)` — no port conflicts, no open handles. |
| Access token in Zustand memory, refresh in httpOnly cookie | XSS can't read memory. CSRF can't read httpOnly. Rotation means a stolen cookie is single-use. This is the complete auth threat model. |
| Prisma `$extends` query component for soft delete | One extension method automatically injects `deletedAt: null` into every read. No query can accidentally surface deleted rows — not even if someone forgets. This replaces the old `$use` approach (removed in Prisma 6). |
| Prisma `$extends` + `AsyncLocalStorage` for audit log | The extension intercepts every create/update/delete at the ORM layer. `AsyncLocalStorage` threads the actor ID from the request context into the extension without prop-drilling. One place; nothing can be skipped. |
| `requireRole` vs `requireProjectAccess` as separate middleware | `requireRole` is stateless — reads the JWT payload, costs zero DB round-trips. `requireProjectAccess` hits the DB to verify ownership or membership. Separating them means coarse gates are cheap and fine-grained checks only run when needed. |
| `@node-rs/argon2` instead of `argon2` | `argon2` (native) requires a C++ build toolchain in Docker (node-gyp, python, make). On Alpine this is a multi-minute install with known breakage. `@node-rs/argon2` ships prebuilt binaries for all target platforms, including `linux-x64-musl` (Alpine). Same Argon2id algorithm, zero build friction. |
| Partial unique index on `User.email` | `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL` means only active users need unique emails. A soft-deleted user's email is immediately available for re-registration. Tradeoff: if an admin later restores the user and the email was re-claimed, restore returns 409 — the admin must update the email first. Documented in `ARCHITECTURE.md`. |
| `PATCH /tasks/:id/move` merges status + position | Separating them would mean a Team Member dragging their own task card fires a position update and gets a 403. A single `move` endpoint with one guard (assignee, owner-pm, or admin) makes the Kanban work correctly for all roles with one atomic DB write. |
| Soft-delete `$extends` and `findUnique` | `findUnique` validates that `where` only contains unique-indexed fields — injecting `deletedAt: null` would throw a Prisma error. The extension converts `findUnique` calls to `findFirst` internally, preserving the filtering behaviour. A second export `prismaUnfiltered` (plain `new PrismaClient()`) is used exclusively by restore endpoints and the admin activity-log query, which must be able to see soft-deleted records. No other code should import `prismaUnfiltered`. |
| `SameSite=None` CSRF exposure | When the cookie is `SameSite=None`, cross-site POST requests will include it, re-opening CSRF. Mitigations already in place: (1) access token is in memory and has a 15-min TTL — an attacker cannot use the cookie alone to act as the user; (2) refresh-token rotation means any stolen token is single-use and detected on the second use; (3) the CORS `origin` allowlist prevents non-allowlisted sites from reading API responses. Documented in `ARCHITECTURE.md`. |

---

## Database schema — Mermaid ERD

```mermaid
erDiagram

  User {
    String   id              PK  "cuid()"
    String   email               "partial unique index WHERE deletedAt IS NULL"
    String   passwordHash
    String   name
    String   avatarUrl           "nullable"
    Role     role                "ADMIN | PROJECT_MANAGER | TEAM_MEMBER"
    Boolean  isEmailVerified
    String   emailVerifyToken    "nullable"
    String   passwordResetToken  "nullable; stored hashed"
    DateTime passwordResetExpiry "nullable"
    DateTime deletedAt           "nullable — soft delete"
    DateTime createdAt
    DateTime updatedAt
  }

  RefreshToken {
    String   id          PK  "cuid()"
    String   tokenHash       "SHA-256 of raw token; never store raw"
    String   userId      FK
    DateTime expiresAt
    DateTime revokedAt       "nullable; set on logout or rotation"
    DateTime createdAt
  }

  Project {
    String        id          PK  "cuid()"
    String        name
    String        description     "nullable"
    ProjectStatus status          "PLANNING | ACTIVE | ON_HOLD | COMPLETED | CANCELLED"
    String        managerId   FK  "→ User"
    DateTime      deletedAt       "nullable — soft delete"
    DateTime      createdAt
    DateTime      updatedAt
  }

  ProjectMember {
    String   id          PK  "cuid()"
    String   projectId   FK
    String   userId      FK
    DateTime joinedAt
  }

  Task {
    String     id           PK  "cuid()"
    String     title
    String     description      "nullable"
    TaskStatus status           "TODO | IN_PROGRESS | IN_REVIEW | DONE"
    Priority   priority         "LOW | MEDIUM | HIGH | URGENT"
    DateTime   dueDate          "nullable"
    Float      position         "Kanban ordering — float allows insertion without renumbering"
    String     projectId    FK
    String     assigneeId   FK  "nullable → User; must be a ProjectMember (validated in service)"
    String     parentTaskId FK  "nullable → Task (subtasks)"
    DateTime   deletedAt        "nullable — soft delete"
    DateTime   createdAt
    DateTime   updatedAt
  }

  Comment {
    String   id          PK  "cuid()"
    String   body
    String   taskId      FK
    String   authorId    FK  "→ User"
    DateTime deletedAt       "nullable — soft delete"
    DateTime createdAt
    DateTime updatedAt
  }

  CommentMention {
    String commentId   FK  "composite PK with userId"
    String userId      FK
  }

  Attachment {
    String   id           PK  "cuid()"
    String   filename         "stored name (uuid-based)"
    String   originalName     "user's original filename"
    String   mimeType
    Int      size             "bytes"
    String   storageKey       "local rel path OR Cloudinary public_id"
    String   storageDriver    "local | cloudinary — determines which SDK deletes it"
    String   taskId       FK
    String   uploaderId   FK  "→ User"
    DateTime createdAt
    DateTime updatedAt
  }

  Tag {
    String   id       PK  "cuid()"
    String   name         "unique"
    String   color        "hex e.g. #3b82f6"
    DateTime createdAt
  }

  TaskTag {
    String taskId   FK  "composite PK with tagId"
    String tagId    FK
  }

  Notification {
    String     id         PK  "cuid()"
    NotifType  type           "TASK_ASSIGNED | MENTION | COMMENT_ON_TASK | STATUS_CHANGED"
    String     userId     FK  "recipient"
    String     actorId    FK  "→ User who triggered the event"
    String     entityType     "task | comment | project"
    String     entityId
    Boolean    isRead
    DateTime   createdAt
  }

  ActivityLog {
    String   id           PK  "cuid()"
    String   entityType       "task | project | user | comment | attachment"
    String   entityId
    String   action           "CREATED | UPDATED | DELETED | RESTORED | STATUS_CHANGED | MEMBER_ADDED | MEMBER_REMOVED"
    String   actorId      FK  "→ User"
    Json     metadata         "{ before, after } snapshot; nullable fields omitted"
    DateTime createdAt
  }

  User          ||--o{ RefreshToken    : "holds"
  User          ||--o{ Project         : "manages"
  User          ||--o{ ProjectMember   : "member of"
  User          ||--o{ Task            : "assigned"
  User          ||--o{ Comment         : "authors"
  User          ||--o{ CommentMention  : "mentioned in"
  User          ||--o{ Attachment      : "uploads"
  User          ||--o{ Notification    : "receives"
  User          ||--o{ ActivityLog     : "acts"

  Project       ||--o{ ProjectMember   : "has members"
  Project       ||--o{ Task            : "contains"

  Task          ||--o{ Task            : "subtasks (self-ref)"
  Task          ||--o{ Comment         : "has"
  Task          ||--o{ Attachment      : "has"
  Task          ||--o{ TaskTag         : "tagged with"
  Task          ||--o{ Notification    : "triggers"

  Comment       ||--o{ CommentMention  : "mentions"

  Tag           ||--o{ TaskTag         : "used in"
```

### Index plan

| Table | Indexed columns | Reason |
|---|---|---|
| `User` | `email` partial unique (`WHERE deletedAt IS NULL`), `deletedAt` | login lookup; soft-delete filter |
| `RefreshToken` | `tokenHash`, `userId`, `expiresAt` | rotation lookup; cleanup by user |
| `Project` | `managerId`, `status`, `deletedAt` | scoped list queries |
| `ProjectMember` | `(projectId, userId)` unique composite | membership check in `requireProjectAccess`; assignee validation |
| `Task` | `projectId`, `assigneeId`, `status`, `dueDate`, `parentTaskId`, `deletedAt` | Kanban, filter/sort, subtask fetch |
| `Comment` | `taskId`, `authorId`, `deletedAt` | comment thread load |
| `Notification` | `userId`, `isRead`, `createdAt` | bell dropdown |
| `ActivityLog` | `(entityType, entityId)` composite, `actorId`, `createdAt` | timeline queries |

---

## Permission matrix (server-side — both guard layers enforced on every route)

| Action | Admin | Project Manager | Team Member |
|---|---|---|---|
| CRUD any user / assign roles | ✅ | ❌ | ❌ |
| View all projects | ✅ | ❌ own only | ❌ member of only |
| Create project | ✅ | ✅ | ❌ |
| Edit / delete project | ✅ | ✅ own only | ❌ |
| Add / remove project members | ✅ | ✅ own only | ❌ |
| Create / edit / delete task | ✅ | ✅ own projects only | ❌ |
| Assign task to user | ✅ | ✅ own projects only | ❌ |
| Assign to non-member of project | 422 validation error | 422 validation error | N/A |
| Move task (status + position) | ✅ | ✅ own projects only | ✅ tasks assigned to them only |
| Comment / upload attachment | ✅ | ✅ own projects only | ✅ projects they're in |
| View audit log | ✅ | ❌ | ❌ |
| Restore soft-deleted items | ✅ | ❌ | ❌ |

**Guard layers:**
1. `requireRole(...roles)` — reads JWT payload; rejects if role not in allowlist. Zero DB calls.
2. `requireProjectAccess(level)` — queries `Project` (manager match) or `ProjectMember` (membership). A PM with the right role but the wrong project is still rejected.

**"Move task" note:** `PATCH /tasks/:id/move { status?, position? }` is a single atomic update. Both fields are optional — within-column reorder sends only `position`; column change sends both. One guard, one DB write. This is why status and position are not separate endpoints.

---

## Phase-by-phase build order

### Phase 1 — Foundation (Day 1)

**Exit condition:** `git clone && cp .env.example .env && docker compose up` boots the full stack with seeded data. `tsc --noEmit` passes everywhere. CI quality job is green.

**Deliverables:**

Infrastructure:
- `pnpm-workspace.yaml`, root `tsconfig.base.json` (strict), `.eslintrc.js`, `.prettierrc`
- `packages/types` — package scaffold; `ApiResponse<T>`, `PaginatedResponse<T>`, all enums
- `apps/api` — Express skeleton, `GET /api/health`, `tsconfig.json`
- `apps/web` — Next.js 15 scaffold, `tsconfig.json`
- `docker-compose.yml`: `postgres:16`, `api`, `web`; health-checks; named volume for `uploads/`
- `docker-compose.override.yml`: bind-mounts for hot-reload in dev
- `.env.example`: every variable documented, no secret defaults

Database:
- `apps/api/prisma/schema.prisma` — full schema per ERD above
- Prisma version pinned in `apps/api/package.json`
- First migration; partial unique index on `User.email` via raw SQL in the migration file
- Seed script: 1 Admin, 3 PMs, 8 Team Members, 5 projects, ~60 tasks across all statuses/priorities, comments, tags, activity entries. Realistic names — not `test1`/`test2`.

CI — **Phase 1 YAML** (quality job only; shown below for your approval before anything is written to `.github/`):

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  quality:
    name: Lint & typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm lint

      - run: pnpm typecheck
```

*(Root `package.json` scripts: `"lint": "pnpm -r lint"`, `"typecheck": "pnpm -r typecheck"` — each workspace runs its own ESLint and `tsc --noEmit`.)*

**Approve this YAML → I write `.github/workflows/ci.yml`. Reject or amend → I update before writing.**

You commit: `chore: scaffold monorepo, docker, prisma schema and seeds`

---

### Phase 2 — Auth & RBAC (Day 1–2)

**Exit condition:** All auth endpoints working. Middleware rejects unauthorised requests before any controller runs. CI quality job still green.

**Deliverables:**

Auth endpoints (all Zod-validated, OpenAPI-annotated):
- `POST /auth/register` — `@node-rs/argon2` hash, email verify token, welcome email
- `POST /auth/login` — issues access token (JWT 15 min, returned in body) + refresh token (7 days, httpOnly Secure SameSite=Strict cookie, stored as SHA-256 hash)
- `POST /auth/logout` — revokes refresh token by hash
- `POST /auth/refresh` — validates token; rotates (issues new, revokes old); reuse of a revoked token revokes ALL tokens for that user
- `POST /auth/forgot-password` — rate-limited 5/15 min; sends reset email
- `POST /auth/reset-password` — validates token, re-hashes password, revokes all refresh tokens
- `GET /auth/verify-email/:token`

Middleware:
- `requireAuth` — verifies JWT, attaches `req.user`, runs `AsyncLocalStorage.run()` to make actorId available to the Prisma extension
- `requireRole(...roles)` — stateless role gate
- `requireProjectAccess(level)` — DB ownership/membership check
- `helmet`, CORS allowlist, `requestId`, rate limiters
- Global error handler; `ok()` / `fail()` envelope factory

You commit: `feat(auth): jwt auth with refresh rotation and rbac middleware`

---

### Phase 3 — Core API (Day 2)

**Exit condition:** All routes live, Zod-validated, OpenAPI-documented, guarded. Swagger UI renders. Postman collection exported. CI gains a test job.

**All routes with guards:**

```
GET    /api/v1/users                       admin; ?search&role&page&limit
POST   /api/v1/users                       admin
PATCH  /api/v1/users/:id                   admin
PATCH  /api/v1/users/:id/role              admin
DELETE /api/v1/users/:id                   admin (soft)

GET    /api/v1/projects                    scoped by role
POST   /api/v1/projects                    admin, pm
GET    /api/v1/projects/:id                project-member+ (owner-pm, member, admin)
PATCH  /api/v1/projects/:id                owner-pm, admin
DELETE /api/v1/projects/:id                owner-pm, admin (soft)
POST   /api/v1/projects/:id/restore        admin
POST   /api/v1/projects/:id/members        owner-pm, admin
DELETE /api/v1/projects/:id/members/:uid   owner-pm, admin
GET    /api/v1/export/projects/:id.csv     owner-pm, admin

GET    /api/v1/tasks                       scoped by role; ?projectId&status&priority
                                           &assigneeId&tag&dueBefore&dueAfter
                                           &search&sort&page&limit
POST   /api/v1/tasks                       owner-pm, admin
                                           (service validates assigneeId ∈ ProjectMember → 422)
GET    /api/v1/tasks/:id                   project-member+
PATCH  /api/v1/tasks/:id                   owner-pm, admin
PATCH  /api/v1/tasks/:id/move              assignee, owner-pm, admin
                                           body: { status?: TaskStatus, position?: number }
                                           atomic update; one permission check
DELETE /api/v1/tasks/:id                   owner-pm, admin (soft)
POST   /api/v1/tasks/:id/restore           admin

GET    /api/v1/tasks/:id/comments          project-member+
POST   /api/v1/tasks/:id/comments          project-member+ (parses @mentions → notifications)
GET    /api/v1/tasks/:id/attachments       project-member+
POST   /api/v1/tasks/:id/attachments       project-member+ (multer 5 MB; MIME allowlist)
DELETE /api/v1/attachments/:id             uploader, owner-pm, admin

GET    /api/v1/notifications               own only; ?page&limit
PATCH  /api/v1/notifications/:id/read
PATCH  /api/v1/notifications/read-all

GET    /api/v1/activity                    admin; ?entityType&actorId&from&to&page&limit
GET    /api/v1/search                      role-scoped; ?q&type&page&limit
GET    /api/v1/dashboard                   role-specific payload

GET    /api/docs                           Swagger UI
GET    /api/health
```

**Other deliverables:**
- `db/client.ts` fully built: `$extends` with (a) soft-delete filter injected on all reads, (b) query component intercepting C/U/D to write `ActivityLog` via `actorContext`
- `NotificationService`: fires on task-assigned, @mention, comment on your task, status-changed-on-your-task
- `EmailService`: welcome/verify, password-reset, task-assigned (Ethereal in dev)
- `StorageService`: both implementations; `STORAGE_DRIVER` selects at startup
- `socket.server.ts`: socket.io attached to HTTP server; notification events emitted server-side only

**CI — Phase 3 addition** (test job; shown for approval before writing to `.github/`):

```yaml
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: quality
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: taskflow
          POSTGRES_PASSWORD: taskflow
          POSTGRES_DB: taskflow_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://taskflow:taskflow@localhost:5432/taskflow_test
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter api exec prisma migrate deploy

      - run: pnpm --filter api test --coverage

      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: apps/api/coverage
```

You commit: `feat(api): projects, tasks, comments, attachments, notifications, audit log`

---

### Phase 4 — Frontend (Day 3)

**Exit condition:** All screens built; responsive; dark mode works from first load; every async surface has skeleton/empty/error states. CI quality job still green.

**Deliverables:**
- Next.js middleware (`middleware.ts`): redirect unauthenticated; role-based nav guarding
- `authStore.ts` (Zustand): access token in memory; never written to `localStorage`
- `api.ts` (axios): 401 interceptor silently calls `/auth/refresh`, retries original request once, then redirects to login on second 401
- Auth pages: Login, Register, Forgot Password, Reset Password, Verify Email
- Dashboard page: delegates to `AdminDashboard` / `PMDashboard` / `MemberDashboard` by role (chart data wired in Phase 5)
- Projects list (card grid + filters) and Project detail
- Kanban board: dnd-kit, 4 columns, drag calls `PATCH /tasks/:id/move`, optimistic update with rollback on server error
- Task list view: table, sort by column, multi-filter, pagination
- Task detail drawer: all fields editable per permissions, subtask list, comment thread with @mention autocomplete, attachment upload (drag-drop + progress bar)
- Users admin page (Admin only): table, search, role edit, soft-delete
- Activity log page (Admin only): filterable timeline
- Notifications bell + dropdown + unread badge
- Global ⌘K command palette (cmdk): search projects + tasks + users, role-scoped
- Profile / settings page: update name, avatar, password
- Skeleton → content, empty state, error state with retry on every async surface
- Toasts (sonner) on every mutation
- Responsive ≥360px; Kanban on mobile = single swipeable column
- Accessibility: keyboard navigable, visible focus rings, ARIA labels, WCAG AA contrast in both themes

You commit: `feat(web): dashboard, kanban, task management, admin console`

---

### Phase 5 — Dashboards, polish & deploy (Day 4)

**Exit condition:** Live URLs up; all three dashboards show real chart data; dark mode QA complete. CI gains a build job.

**Deliverables:**
- `GET /api/v1/dashboard` — role-specific JSON shapes (typed in `packages/types`)
- **Admin:** users-by-role donut, projects-by-status bar, tasks-created/completed 30-day line, recent activity feed, system stats
- **PM:** project health table, tasks-by-status stacked bar, overdue count, team-workload-by-assignee horizontal bar, upcoming deadlines
- **Member:** open tasks by priority donut, due-this-week list, completion rate over time line, recent notifications
- Dark mode QA pass: every screen checked, broken contrast fixed
- Favicon, meta tags (`next/metadata`)
- Deploy: Frontend → Vercel, API → Render (Docker image), DB → Neon. Verify login end-to-end on live URL.

**CI — Phase 5 addition** (build job; shown for approval before writing to `.github/`):

```yaml
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter api build

      - run: pnpm --filter web build

      - name: Validate API Dockerfile
        run: docker build -t taskflow-api ./apps/api

      - name: Validate web Dockerfile
        run: docker build -t taskflow-web ./apps/web
```

You commit:
- `feat(web): role-specific dashboards with charts`
- `chore: production deployment`

---

### Phase 6 — Tests, CI, docs (Day 5)

**Exit condition:** CI green on `main`. README submission-ready. Every acceptance criterion in `FEATURE_REPORT.md` ticked.

**Backend tests (Vitest + Supertest):**
- Auth: register, login, wrong password, refresh rotation, rotated-token reuse rejected, rate-limit blocks 6th attempt
- RBAC money tests:
  - Team Member `POST /tasks` → 403
  - Team Member `GET /users` → 403
  - PM editing another PM's project → 403
  - PM adding member to a project they don't own → 403
  - Team Member calling `PATCH /tasks/:id/move` on a task not assigned to them → 403
  - Unauthenticated request to any protected route → 401
- Validation: bad payload → 422 with `errors` array containing field-level messages
- Assignee validation: `POST /tasks` with `assigneeId` not in `ProjectMember` → 422
- Task lifecycle: create → assign → notification created → status update via `/move` → activity logged
- Soft delete: deleted task excluded from list; restorable by admin only; non-admin restore → 403

**Frontend tests (Vitest + Testing Library, light):**
- Auth form: validation errors shown on invalid submit; API called on valid submit
- Kanban column: task card renders; drag event fires `PATCH /tasks/:id/move` with correct body

**Docs:**
- `README.md`: badges, screenshots, features list, tech stack, architecture diagram, ERD (Mermaid), use-case diagram (Mermaid), quickstart (`docker compose up`), demo accounts with plaintext passwords, API docs link, testing section, CI/CD explanation, AI usage disclosure
- `docs/FEATURE_REPORT.md`: Feature | Required/Extra | Status | Notes
- `docs/CICD.md`: what each CI job does and why; how jobs were grown phase by phase
- `docs/ARCHITECTURE.md`: request lifecycle, auth flow diagram, soft-delete email tradeoff, audit log threading via `AsyncLocalStorage`, folder rationale
- `postman_collection.json`

You commit:
- `test: auth, rbac and task lifecycle coverage`
- `docs: readme, diagrams, feature report`

---

## CI evolution summary

| Added in | Jobs present |
|---|---|
| Phase 1 | `quality` (lint + typecheck) |
| Phase 3 | + `test` (Postgres service, migrate, vitest --coverage) |
| Phase 5 | + `build` (build api, build web, docker build both) |

Each addition is shown to you as a full YAML block for approval before anything is written to `.github/`.

---

## Acceptance checklist (verify before submitting)

- [ ] `git clone && cp .env.example .env && docker compose up` → app running with seeded data, zero manual steps
- [ ] README lists 3 demo logins that work on the live deployed URL
- [ ] Live URL up; frontend talks to backend; login works there
- [ ] CI green on `main`; badge in README
- [ ] Every RBAC rule enforced server-side and covered by a passing test
- [ ] No secret or token in the repo; `.env.example` is complete
- [ ] `tsc --noEmit` and `eslint` pass with zero errors on both apps
- [ ] Swagger UI loads at `/api/docs`; every endpoint documented
- [ ] Every list endpoint paginates, filters and sorts
- [ ] Every mutation returns standard envelope; every 4xx/5xx has a useful message
- [ ] UI usable at 360px; dark mode has no broken contrast
- [ ] ERD, use-case and architecture diagrams render in README
- [ ] No AI attribution anywhere in commits, code, or PRs
- [ ] `docs/FEATURE_REPORT.md` maps every graded criterion to where it's satisfied
