# Server Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy repo scripts needed for build steps
COPY scripts /scripts

# Copy and build AI configs package
COPY packages/ai-configs ./ai-configs
WORKDIR /app/ai-configs
RUN npm install && npm run build

# Copy and install core package first
WORKDIR /app
COPY packages/ai-chat-core ./ai-chat-core
WORKDIR /app/ai-chat-core
RUN npm install

# Copy MCP assistant package
WORKDIR /app
COPY packages/mcp-assistant ./mcp-assistant

# Install MCP assistant dependencies (shared via workspace links)
WORKDIR /app/mcp-assistant
RUN npm install

# Switch to server directory and copy package files
WORKDIR /app/server
COPY packages/server/package*.json ./
COPY packages/server/tsconfig.json ./

# Install server dependencies (this will link to the core package)
RUN npm install

# Expose node_modules for workspace packages
RUN ln -s /app/server/node_modules /app/node_modules

# Copy server source
COPY packages/server/src ./src

# Build TypeScript output
RUN npm run build

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the server
CMD ["node", "dist/app.js"]
