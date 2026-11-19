# Multi-stage production Dockerfile for Yap Backend
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies in a clean layer
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Production runner stage
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Run with non-root user for security
USER node

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
