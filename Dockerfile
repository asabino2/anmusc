# ==========================================
# Multi-stage Dockerfile using Alpine Linux
# Base OS: Alpine Linux (node:22-alpine)
# Clones repository from GitHub: https://github.com/asabino2/anmusc.git
# ==========================================

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install git to clone repository
RUN apk add --no-cache git

# Clone repository into working directory
RUN git clone https://github.com/asabino2/anmusc.git /app

# Install all dependencies (including devDependencies required for build)
RUN npm ci

# Build Vite frontend and bundled Node backend
RUN npm run build

# Stage 2: Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built bundle from builder stage
COPY --from=builder /app/dist ./dist

# Expose server port
EXPOSE 3000

# Health check to ensure server is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start production server
CMD ["node", "dist/server.cjs"]
