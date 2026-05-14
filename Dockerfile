# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.18.2

############################
# Base
############################
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

############################
# Dependencies (prod only)
############################
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

############################
# Build stage
############################
FROM base AS build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build app (Next.js / TS etc.)
RUN npm run build

############################
# Final (minimal runtime)
############################
FROM node:${NODE_VERSION}-alpine AS final

WORKDIR /app
ENV NODE_ENV=production

# Copy only required files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Optional: if Next.js, use this instead of dist
# COPY --from=build /app/.next ./.next
# COPY --from=build /app/public ./public

# Entrypoint for Prisma migrate (important)
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]