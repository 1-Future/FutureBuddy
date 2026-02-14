# FutureBuddy Web — Vite build + Nginx serve
# Multi-stage build for minimal image size

# Stage 1: Build the web frontend
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files for better layer caching
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web/package.json web/

RUN npm ci --ignore-scripts

# Copy source
COPY shared/ shared/
COPY web/ web/
COPY tsconfig.json ./

# Build shared first (web may reference shared types), then web
RUN npm run build -w shared && npm run build -w web

# Stage 2: Serve with Nginx
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/web/dist /usr/share/nginx/html

# Nginx config for SPA routing + API proxy
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
