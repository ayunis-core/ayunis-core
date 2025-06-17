# Docker Setup for Ayunis Core Backend

This project uses Docker Compose to set up both production and development environments with NestJS and PostgreSQL with pgvector extension.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git (to clone the repository)

## Getting Started

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your specific configuration values

3. Choose your environment:

   **For production:**

   ```bash
   docker-compose up -d
   ```

   **For development with hot reloading:**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. The services will be available at:
   - NestJS API: http://localhost:3000
   - PostgreSQL: localhost:5432

## Services

- **api**: NestJS application running on Node.js
- **postgres**: PostgreSQL database with pgvector extension enabled

## Environment Variables

The following environment variables can be configured in your `.env` file:

- `NODE_ENV`: Environment mode (development, production)
- `PORT`: Port for the NestJS application
- `DATABASE_HOST`: PostgreSQL host (use 'postgres' for Docker communication)
- `DATABASE_PORT`: PostgreSQL port
- `DATABASE_USER`: PostgreSQL username
- `DATABASE_PASSWORD`: PostgreSQL password
- `DATABASE_NAME`: PostgreSQL database name
- `MISTRAL_API_KEY`: Your Mistral API key

## Development Environment

The development environment (`docker-compose.dev.yml`) provides:

- Hot reloading: Changes to your source code will automatically reload the application
- Mounted volumes: Your local source code is mounted into the container
- Preserved node_modules: A named volume keeps the node_modules directory intact
- Debugging port: Port 9229 is exposed for debugging

## Production Environment

The production environment (`docker-compose.yml`) provides:

- Multi-stage build: Smaller and more secure Docker image
- Production-optimized: Only production dependencies are installed
- Prebuilt application: The application is built during the Docker build process

## Useful Commands

```bash
# Start production services
docker-compose up -d

# Start development services with hot reloading
docker-compose -f docker-compose.dev.yml up -d

# Stop services (use the same file you used to start)
docker-compose down
# or
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose logs -f
# or
docker-compose -f docker-compose.dev.yml logs -f

# View logs for a specific service
docker-compose logs -f api
# or
docker-compose -f docker-compose.dev.yml logs -f api

# Rebuild services
docker-compose up -d --build
# or
docker-compose -f docker-compose.dev.yml up -d --build

# Remove volumes when stopping (will delete database data)
docker-compose down -v
# or
docker-compose -f docker-compose.dev.yml down -v
```
