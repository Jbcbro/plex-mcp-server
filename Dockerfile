# ── Build stage ──
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Production stage ──
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build/ ./build/

# Create exports directory for library export feature
RUN mkdir -p /app/exports

ENV NODE_ENV=production

# Default entry point: Plex-only server
# Override with SERVER_MODE env var (see entrypoint below)
ENV SERVER_MODE=plex

# Use HTTP transport for Docker (instead of stdio)
ENV TRANSPORT=http
EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
