FROM node:20-alpine AS builder

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

FROM node:20-alpine AS production

# Install build dependencies for bcrypt
RUN apk add --no-cache python3 make g++ gcc

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create .env file if it doesn't exist
RUN touch .env

# Set environment variables
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"] 