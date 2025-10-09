# Multi-stage build for production deployment
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY ayunis-core-frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY ayunis-core-frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy backend package files
COPY ayunis-core-backend/package*.json ./
RUN npm ci

# Copy backend source
COPY ayunis-core-backend/ ./

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend

# Build backend
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

# Install runtime dependencies for bcrypt
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy package files and install production dependencies
COPY ayunis-core-backend/package*.json ./
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Copy built backend from builder stage
COPY --from=backend-builder /app/dist ./dist

# Copy frontend files from builder stage into dist/frontend
COPY --from=backend-builder /app/frontend ./dist/frontend

# Create uploads directory
RUN mkdir -p uploads

# Set environment variables
ENV NODE_ENV=production
# PORT is set via environment variable at runtime, defaults to 3000 in app code
# Port exposure is handled by docker-compose port mapping

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "dist/src/main.js"] 