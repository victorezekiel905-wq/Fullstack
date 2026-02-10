<<<<<<< HEAD
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production
=======
# ================================
# STAGE 1: Builder
# ================================
FROM node:lts-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install ALL dependencies (including dev) for build
RUN npm ci --only=production=false \
    --legacy-peer-deps \
    --no-audit \
    --no-fund \
    --loglevel=error

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# ================================
# STAGE 2: Production
# ================================
FROM node:lts-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init
>>>>>>> d778a5b3934d46b85783877a525f77a2d11421e4

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

<<<<<<< HEAD
# Copy production dependencies and build artifacts
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
=======
# Copy package files and install ONLY production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production \
    --legacy-peer-deps \
    --no-audit \
    --no-fund \
    --loglevel=error && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app
>>>>>>> d778a5b3934d46b85783877a525f77a2d11421e4

# Switch to non-root user
USER nestjs

<<<<<<< HEAD
# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application (port is read from ENV)
CMD ["node", "dist/main"]
=======
# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port (dynamic for Render)
EXPOSE ${PORT}

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
>>>>>>> d778a5b3934d46b85783877a525f77a2d11421e4
