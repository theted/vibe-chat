# Server Dockerfile

# Stage 1 - build client assets
FROM node:18-alpine AS client-builder
WORKDIR /app/client

COPY packages/client/package.json ./package.json
# Install dependencies (include dev deps for Vite build)
RUN npm install --include=dev

COPY packages/client/ .

ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build

# Stage 2 - build server
FROM node:18-alpine
WORKDIR /app

# Copy and install core package first
COPY packages/ai-chat-core ./ai-chat-core
WORKDIR /app/ai-chat-core
RUN npm install

# Switch to server directory and copy package files
WORKDIR /app/server
COPY packages/server/package*.json ./

# Install server dependencies (this will link to the core package)
RUN npm install

# Copy server source
COPY packages/server/src ./src

# Copy built client assets
COPY --from=client-builder /app/client/dist ./public

ENV STATIC_DIR=/app/server/public

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the server
CMD ["node", "src/app.js"]
