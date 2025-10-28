# Client Dockerfile - Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files and install dependencies
COPY packages/client/package.json ./
RUN npm install react-markdown@^9.1.0 && npm install

# Copy source files
COPY packages/client/src ./src
COPY packages/client/index.html ./
COPY packages/client/vite.config.js ./
COPY packages/client/tailwind.config.mjs ./
COPY packages/client/postcss.config.js ./

# Set build-time environment variables
ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY packages/client/nginx.conf /etc/nginx/nginx.conf

# Create nginx directories and set permissions
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /tmp/nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]