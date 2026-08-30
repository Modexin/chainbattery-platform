# ===== Build Stage =====
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend dependencies (cached layer)
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# ===== Runtime Stage =====
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/backend/node_modules ./backend/node_modules

# Copy backend source
COPY backend/ ./backend/

# Copy frontend static files
COPY src/ ./src/

# Create data directory for SQLite volume mount
RUN mkdir -p /data

WORKDIR /app/backend

EXPOSE 3000

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
