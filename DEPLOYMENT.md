# Production Deployment Guide

This guide explains how to deploy the Ayunis Core application stack to production using Docker and Docker Compose.

## Overview

The production setup includes:

- **Frontend and Backend**: React frontend built and bundled into a NestJS server
- **PostgreSQL Database**: With pgvector extension for embeddings
- **MinIO Object Storage**: For file storage
- **Health Checks**: Automated health monitoring
- **Production Optimizations**: Multi-stage builds, proper networking, security considerations

## Prerequisites

- Docker and Docker Compose installed
- At least 2GB RAM available
- API keys for at least one AI provider (Mistral, OpenAI, Anthropic)

## Quick Start

**Clone the repository and navigate to the project root**

```bash
cd /path/to/ayunis-core
```

**Create your production environment file (only backend required)**

```bash
cp ./core-backend/env.example ./core-backend/.env
```

**Edit the environment file with your production values**

```bash
nano ./core-backend/.env
```

**Build and start the production stack**

```bash
docker-compose up -d --build
```

**Run migrations**

```bash
docker-compose exec app npx typeorm-ts-node-commonjs migration:run -d dist/db/datasource.js
```

**Check service health**

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs app
```

**Access the application**

- Application: http://localhost:3000

## Troubleshooting

### Container won't start

- Check logs: `docker-compose -f docker-compose.prod.yml logs app`
- Verify environment variables in `.env.prod`
- Ensure required secrets are set
- Ensure up to date migrations

### Database connection issues

- Verify PostgreSQL container is healthy
- Check database credentials
- Ensure network connectivity between services

### Build issues

- Clear Docker cache: `docker system prune -a`
- Check for file permission issues
- Verify all source files are present

## Support

For issues and questions:

- Check container logs first
- Verify environment configuration
- Review this deployment guide
- Check Docker and system resources
