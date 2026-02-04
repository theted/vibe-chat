# syntax=docker/dockerfile:1.4
# Server Dockerfile
FROM node:22-alpine AS deps

# Enable pnpm via corepack
RUN corepack enable pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy each package.json to preserve directory structure (glob doesn't work in Docker)
COPY packages/server/package.json ./packages/server/
COPY packages/ai-chat-core/package.json ./packages/ai-chat-core/
COPY packages/ai-configs/package.json ./packages/ai-configs/
COPY packages/mcp-assistant/package.json ./packages/mcp-assistant/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile --filter=@ai-chat/server...

FROM deps AS builder

WORKDIR /app

COPY . .

RUN pnpm run build:server

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/scripts ./scripts

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

CMD ["node", "dist/app.js"]
