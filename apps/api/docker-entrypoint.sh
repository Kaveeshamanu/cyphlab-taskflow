#!/bin/sh
set -e

cd /app/apps/api

echo "[entrypoint] generating Prisma client..."
node_modules/.bin/prisma generate

echo "[entrypoint] applying migrations..."
node_modules/.bin/prisma migrate deploy

echo "[entrypoint] seeding database..."
node_modules/.bin/tsx prisma/seed.ts

echo "[entrypoint] starting server..."
if [ "${NODE_ENV:-development}" = "production" ]; then
  exec node dist/server.js
else
  exec node_modules/.bin/tsx watch src/server.ts
fi
