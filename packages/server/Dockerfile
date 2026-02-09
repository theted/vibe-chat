# syntax=docker/dockerfile:1.4
# Server Dockerfile
FROM oven/bun:alpine AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy each package.json to preserve directory structure (glob doesn't work in Docker)
COPY packages/server/package.json ./packages/server/
COPY packages/ai-chat-core/package.json ./packages/ai-chat-core/
COPY packages/ai-configs/package.json ./packages/ai-configs/
COPY packages/mcp-assistant/package.json ./packages/mcp-assistant/

RUN --mount=type=cache,target=/root/.bun/install/cache bun install

FROM deps AS builder

WORKDIR /app

COPY . .

RUN bun run build:server

FROM oven/bun:alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/scripts ./scripts

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" || exit 1

CMD ["bun", "dist/app.js"]
