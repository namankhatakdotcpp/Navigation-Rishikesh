# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --prefer-offline

COPY tsconfig.json .
COPY src ./src/

# Generate Prisma client then compile TypeScript
RUN npx prisma generate && npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production --prefer-offline && npx prisma generate

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S rtgapi -u 1001
USER rtgapi

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/app.js"]
