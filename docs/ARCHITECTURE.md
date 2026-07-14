# Architecture

> This file is a Phase 6 deliverable (request lifecycle, auth flow diagram, full folder
> rationale). It's started early here only to record two security-header decisions made
> during Phase 2 debugging, before the reasoning is lost — Phase 6 will expand this into
> the complete document.

## Security headers (helmet)

`apps/api/src/app.ts` applies `helmet()` globally with two deviations from its defaults,
both scoped as narrowly as possible:

- **HSTS is production-only** (`hsts: env.NODE_ENV === 'production'`). Helmet's default
  sends `Strict-Transport-Security` on every response, which tells the browser to force
  every future request to this origin onto `https://` for the header's `max-age` window.
  Render terminates TLS in production, so that's correct there. The local/Docker stack
  only speaks plain HTTP — with the header on, a browser that had ever loaded the API
  once would fail *every subsequent request* with a TLS error, including all of Swagger
  UI's asset requests (`swagger-ui.css`, `swagger-ui-bundle.js`, etc.), rendering the docs
  page blank with no visible error beyond the browser console. This is applied via the
  global `NODE_ENV` check rather than per-route, since it's an origin-wide browser policy,
  not something that makes sense to vary by path.

- **`/api/docs` gets a relaxed CSP**, applied only to that route via a second
  `helmet.contentSecurityPolicy(...)` middleware layered on top of the global one in
  `apps/api/src/openapi/swagger.ts`. swagger-ui-dist's bundle relies on inline `<script>`
  execution and inline styles to mount the UI; the app's default CSP
  (`script-src 'self'`, no `'unsafe-inline'`) silently blocks that with no visible HTML
  error. Every other route keeps the strict global default — the override is scoped to
  the docs routes only, not applied app-wide.

Both are runtime-only failure modes: they don't show up in `tsc`, `eslint`, or the
Vitest suite testing response bodies, only in an actual browser hitting the actual
server. The HSTS behavior now has a regression test (`tests/security.test.ts`) asserting
the header is absent outside production and present when `NODE_ENV=production`.
