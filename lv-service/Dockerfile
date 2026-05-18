FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN pnpm install --omit=dev

COPY dist/ ./dist/

EXPOSE 5000
CMD ["node", "dist/index.js"]
