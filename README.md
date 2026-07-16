# TaskFlow

> **Project & Team Task Management Platform**
>
> Full-stack take-home for the CyphLab Intern Full Stack Developer role.

> **Live demo note:** The API is hosted on Render's free tier, which sleeps after ~15 min of inactivity. The first request after idle will take ~50 s to respond — this is expected and not a broken link.

> **Deploying this yourself?** See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full Neon → Render → Vercel runbook, exact env vars, and the cross-site cookie/CORS config.

---

## Quick start (Docker — zero manual steps)

```bash
git clone <repo-url>
cd cyphlab-taskflow
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost:3000
- API → http://localhost:3001
- API docs (OpenAPI spec) → http://localhost:3001/api/docs.json

---

## API documentation

The OpenAPI 3.0 spec is served at [`/api/docs.json`](http://localhost:3001/api/docs.json) —
import that URL into any OpenAPI-compatible client (Postman, Insomnia, VS Code REST client).
A ready-to-import Postman collection is also checked in at
[`postman_collection.json`](./postman_collection.json) (repo root), generated from the same
spec via `pnpm --filter @taskflow/api generate:postman` so the two never drift.

*(Swagger UI's HTML renderer at `/api/docs` has an asset-loading issue in Safari — the spec
itself is complete; use the JSON endpoint or the Postman collection above.)*

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | sarah@taskflow.dev | Password123! |
| Project Manager | james@taskflow.dev | Password123! |
| Team Member | aisha@taskflow.dev | Password123! |

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | TanStack Query + Zustand |
| Backend | Node.js + Express + TypeScript |
| ORM | Prisma 5.22.0 |
| Database | PostgreSQL 16 |
| Auth | JWT (access) + httpOnly cookie (refresh, rotated) |
| Validation | Zod |
| Testing | Vitest + Supertest |
| CI | GitHub Actions |
| Deploy | Vercel (web) · Render (api) · Neon (db) |

---

*Full documentation — ERD, architecture diagram, feature report, CI/CD explanation — added in Phase 6.*

---

## AI usage disclosure

**AI tools used:** Claude Code (Anthropic).
**What it assisted with:** project scaffolding, boilerplate CRUD controllers, Tailwind/shadcn component wiring, Docker and CI configuration, seed data generation, and test scaffolding.
**What I designed and wrote myself:** the data model and all entity relationships, the authentication flow (refresh-token rotation, hashing strategy), the role- and ownership-based authorization middleware, and the authorization test suite.
**Review process:** I reviewed every diff before committing and can explain every design decision in the codebase.
