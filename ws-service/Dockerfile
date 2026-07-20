FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
