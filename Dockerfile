# ── CPLAuction — production image ─────────────────────────────────
# Works on Fly.io, Render, Railway, DigitalOcean App Platform, or any
# container host. Uses SQLite on a persistent volume by default; set
# DATABASE_URL to a hosted Postgres/MySQL URL to use that instead
# (after updating prisma/schema.prisma's datasource.provider).

# ── Stage 1: install deps + build ─────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install OS deps Prisma needs on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── Stage 2: minimal runtime image ────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    DATABASE_URL="file:/data/prod.db"

RUN apk add --no-cache openssl libc6-compat \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# /data holds the SQLite file across container restarts (mount a volume here)
RUN mkdir -p /data && chown -R nextjs:nodejs /data
USER nextjs

EXPOSE 3000

# On first boot: sync schema + seed if the DB file doesn't exist yet.
CMD sh -c "\
  if [ ! -f /data/prod.db ]; then \
    echo '📦 First-run: creating and seeding database'; \
    npx prisma db push --skip-generate && npx tsx prisma/seed.ts; \
  else \
    npx prisma db push --skip-generate; \
  fi; \
  npx tsx server.ts"
