# syntax=docker/dockerfile:1.4
# Client Dockerfile - Multi-stage build
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/*/package*.json ./packages/

RUN --mount=type=cache,target=/root/.npm npm ci --workspace=@ai-chat/client

FROM deps AS builder

WORKDIR /app

COPY . .

ARG VITE_SERVER_URL=http://localhost:3001
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm --workspace @ai-chat/ai-configs run build
RUN npm --workspace @ai-chat/client run build

FROM nginx:alpine AS runner

RUN apk add --no-cache curl

COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx && \
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /tmp/nginx /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
