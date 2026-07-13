# Build context must be the monorepo root: `docker build -f apps/web/Dockerfile .`

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── Install dependencies ────────────────────────────────────────────────────

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY tsconfig.base.json ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @taskflow/types build
RUN pnpm --filter @taskflow/web build

# ── Runtime ─────────────────────────────────────────────────────────────────

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Without outputFileTracingRoot, standalone output is rooted at the app directory.
# Copying it to WORKDIR /app means server.js lands at /app/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Static files must be at .next/static relative to server.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
