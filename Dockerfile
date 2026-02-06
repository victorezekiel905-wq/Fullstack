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

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

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

# Switch to non-root user
USER nestjs

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
