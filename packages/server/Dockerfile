# syntax=docker/dockerfile:1.4
# Server Dockerfile
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/*/package*.json ./packages/

RUN --mount=type=cache,target=/root/.npm npm ci --workspace=@ai-chat/server

FROM deps AS builder

WORKDIR /app

COPY . .

RUN npm run build:server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/scripts ./scripts

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["node", "dist/app.js"]
