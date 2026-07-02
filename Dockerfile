# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.2

############################
# Base
############################
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

############################
# Dependencies (all, needed for build)
############################
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile

############################
# Build stage
############################
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js standalone application
RUN npm i -g pnpm && STANDALONE=true pnpm run build

############################
# Final (minimal standalone runtime)
############################
FROM node:${NODE_VERSION}-alpine AS final

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create low-privilege system user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=build /app/public ./public

# Copy the standalone server and static files (includes traced node_modules)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + generated client (engine binaries may not be traced by standalone)
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Standalone output generates server.js as the entrypoint
CMD ["node", "server.js"]