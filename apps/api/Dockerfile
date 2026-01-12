FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.10.0 --activate

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy the entire monorepo (Railway sets root to apps/api, so we go up)
COPY ../.. .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm turbo run build --filter=@hyper-trigger/api

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy built packages
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Copy API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/api

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

CMD ["node", "dist/main.js"]
