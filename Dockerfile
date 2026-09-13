# Production Multi-Stage Dockerfile for HashApe PoW Mining Server
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY dist/ ./dist/
COPY collection/ ./collection/
COPY data/ ./data/
COPY serve.js ./
COPY supabaseAdapter.js ./
COPY contracts/ ./contracts/

# Expose HTTP port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/system/health || exit 1

CMD ["node", "serve.js"]
