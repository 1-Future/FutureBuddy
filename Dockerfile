# FutureBuddy — Your 24/7 IT Department
# Multi-stage build for minimal image size

# Stage 1: Build shared + server
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/

RUN npm ci --ignore-scripts

# Copy source
COPY shared/ shared/
COPY server/ server/
COPY tsconfig.json ./

# Build shared first, then server
RUN npm run build -w shared && npm run build -w server

# Stage 2: Production image
FROM node:22-slim AS production

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/

# Install production deps only
RUN npm ci --omit=dev --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/server/dist server/dist

# Data directory for SQLite persistence
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/futurebuddy.db

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
