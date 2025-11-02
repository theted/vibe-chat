# Server Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy and install core package first
COPY packages/ai-chat-core ./ai-chat-core
WORKDIR /app/ai-chat-core
RUN npm install

# Copy MCP assistant package
WORKDIR /app
COPY packages/mcp-assistant ./mcp-assistant

# Install MCP assistant dependencies (shared via workspace links)
WORKDIR /app/mcp-assistant
RUN npm install --omit=dev

# Switch to server directory and copy package files
WORKDIR /app/server
COPY packages/server/package*.json ./

# Install server dependencies (this will link to the core package)
RUN npm install

# Expose node_modules for workspace packages
RUN ln -s /app/server/node_modules /app/node_modules

# Copy server source
COPY packages/server/src ./src

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the server
CMD ["node", "src/app.js"]
