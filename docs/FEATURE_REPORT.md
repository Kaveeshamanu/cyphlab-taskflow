# Feature Completion Report

This report maps every feature to its status and notes honestly where scope was trimmed. It also maps each stated grading criterion to where in the project it is satisfied.

Legend: ✅ Complete · ⬜ Not implemented (with rationale)

---

## Required features

| Feature | Status | Notes |
|---|:---:|---|
| User registration & login | ✅ | Register, login, logout, refresh, forgot/reset password, email verification |
| Three roles (Admin, PM, Team Member) | ✅ | Enum on `User.role`; drives both navigation and server-side guards |
| Admin — manage users & assign roles | ✅ | Users admin page + `PATCH /users/:id/role` |
| Admin — overall system access | ✅ | All projects, activity/audit log, restore |
| PM — create & manage own projects | ✅ | Ownership enforced via `managerId` check, not just the PM role |
| PM — assign members & manage tasks | ✅ | Scoped to projects the PM owns |
| Team Member — view assigned projects/tasks | ✅ | Scoped to `ProjectMember` membership |
| Team Member — update own task progress | ✅ | Can move only tasks assigned to them (Kanban drag) |
| Full CRUD (users, projects, tasks, members) | ✅ | All with validation and soft delete |
| RESTful API | ✅ | Versioned under `/api/v1`, consistent response envelope |
| Database relationships | ✅ | See ERD in README — many-to-many join tables, self-referencing FK, nullable assignee |
| Input validation | ✅ | Zod on every request body, query, and param |
| Responsive UI | ✅ | Works down to mobile widths; Kanban collapses on small screens |
| Secure authentication | ✅ | Argon2id hashing, rotating refresh tokens in httpOnly cookies, rate limiting |
| Role-based authorization | ✅ | Two layers — coarse role check + DB-backed ownership/membership check |
| Git usage | ✅ | Conventional commits, per-phase feature branches merged via PRs |
| CI/CD | ✅ | GitHub Actions (lint → typecheck → test → build); auto-deploy on merge to `main` |

---

## Extra features implemented

| Feature | Status | Notes |
|---|:---:|---|
| Kanban board with drag-and-drop | ✅ | `@dnd-kit`; optimistic update with rollback; persists via `PATCH /tasks/:id/move` |
| Role-specific dashboards with charts | ✅ | Recharts; Admin/PM/Member each get a different payload |
| Task comments with @mentions | ✅ | Mentions parsed and stored as a many-to-many relation |
| File attachments | ✅ | Cloudinary in production behind a swappable `StorageService` interface |
| In-app notifications | ✅ | Fire on assignment, mention, comment, status change |
| Activity / audit log | ✅ | Central Prisma client extension records every create/update/delete; admin-visible |
| Global search (⌘K command palette) | ✅ | Role-scoped across projects, tasks, users |
| Soft delete + admin restore | ✅ | `deletedAt` filtered by a Prisma extension; `prismaUnfiltered` escape hatch for restore |
| Dark mode | ✅ | `next-themes`, WCAG-AA contrast in both themes |
| Task priority, due dates, tags | ✅ | Filterable and sortable on list endpoints |
| Pagination / filtering / sorting | ✅ | Server-side on all list endpoints |
| Swagger / OpenAPI docs + Postman collection | ✅ | `/api/docs` and `postman_collection.json` |
| Docker Compose (one-command boot) | ✅ | Generates client, migrates, seeds, and starts with `docker compose up` |
| Live deployment | ✅ | Vercel + Railway + Neon |

---

## Intentionally scoped out

Trimmed to keep the core complete, tested, and deployed within the five-day budget. The data model already supports each, so these are UI-layer gaps, not architectural ones.

| Feature | Status | Rationale |
|---|:---:|---|
| Subtask UI | ⬜ | `Task.parentTaskId` (self-referencing FK) exists in the schema; the create/nest UI was cut. API supports it. |
| Tag editing UI | ⬜ | Tags are seeded and displayed/filterable; an inline tag editor was cut. |
| Profile editing UI | ⬜ | User profile is viewable; the self-edit form was cut. Admin user management is fully present. |

---

## Grading criteria — where each is satisfied

| Criterion | Where it's demonstrated |
|---|---|
| Completion of required features | Required-features table above; all ✅ |
| Code quality & project structure | pnpm monorepo (`apps/web`, `apps/api`, `packages/types`); shared Zod schemas as a single source of truth; small single-purpose files |
| Authentication & role-based authorization | Argon2id + rotating refresh tokens (httpOnly cookies); two-layer RBAC (`requireRole` + DB-backed ownership guards); permission matrix in README; RBAC integration tests |
| Database design & relationships | ERD in README; many-to-many via join tables (`ProjectMember`, `TaskTag`, comment mentions), self-referencing task FK, nullable assignee, indexed FKs, soft-delete column |
| Frontend usability & responsiveness | shadcn/ui components, skeleton/empty/error states on every async surface, toasts on mutations, dark mode, mobile-responsive Kanban |
| API design & validation | Versioned `/api/v1`, consistent `{ success, data, message, errors }` envelope, Zod validation, pagination/filter/sort, Swagger docs |
| Git usage & commit history | Conventional commits across per-phase feature branches, merged through PRs; steady history rather than one dump |
| Testing & CI/CD | Vitest + Supertest integration tests focused on auth and RBAC; GitHub Actions runs lint → typecheck → test (against real Postgres) → build |
| Documentation & ability to explain | This report, the README (setup, diagrams, architecture, AI disclosure), Swagger docs, and inline rationale for the harder decisions (cross-site cookies, soft-delete escape hatch, storage abstraction) |
