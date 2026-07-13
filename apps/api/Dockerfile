# Build context must be the monorepo root: `docker build -f apps/api/Dockerfile .`

FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# ── Install dependencies ────────────────────────────────────────────────────

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/api/prisma/schema.prisma apps/api/prisma/
RUN pnpm install --frozen-lockfile
# postinstall can't locate a non-root schema; generate explicitly so the
# anonymous volume that backs /app/node_modules already contains the client
RUN cd apps/api && node_modules/.bin/prisma generate

# ── Build ───────────────────────────────────────────────────────────────────

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY packages/types ./packages/types
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

RUN cd apps/api && node_modules/.bin/prisma generate
RUN pnpm --filter @taskflow/types build
RUN pnpm --filter @taskflow/api build

# ── Runtime ─────────────────────────────────────────────────────────────────

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json

RUN chmod +x apps/api/docker-entrypoint.sh
RUN mkdir -p apps/api/uploads

EXPOSE 3001
CMD ["sh", "apps/api/docker-entrypoint.sh"]
