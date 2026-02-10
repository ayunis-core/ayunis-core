# Ayunis Core Deployment Guide

This guide covers deploying Ayunis Core to production and managing configuration updates.

## Table of Contents

1. [Initial Deployment](#initial-deployment)
2. [Environment Configuration](#environment-configuration)
3. [Database Migrations](#database-migrations)
4. [MCP Integration Setup](#mcp-integration-setup)
5. [Configuration Updates](#configuration-updates)
6. [Troubleshooting](#troubleshooting)

## Initial Deployment

### Prerequisites

- Node.js 18 or higher
- npm
- Docker and Docker Compose
- PostgreSQL database (can be containerized)
- Sufficient disk space for embeddings and file storage

### Deployment Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ayunis-core.git
   cd ayunis-core
   ```

2. **Create environment files**
   ```bash
   cp .env.example .env
   cp ayunis-core-backend/.env.example ayunis-core-backend/.env
   cp ayunis-core-frontend/.env.example ayunis-core-frontend/.env
   ```

3. **Configure environment variables**
   - Edit `ayunis-core-backend/.env` with your production values
   - See [Environment Configuration](#environment-configuration) for details
   - Critical variables: `JWT_SECRET`, `COOKIE_SECRET`, `MCP_ENCRYPTION_KEY`, `DATABASE_*`

4. **Start services**
   ```bash
   docker compose up -d --build
   ```

5. **Run migrations**
   ```bash
   cd ayunis-core-backend
   npm run migration:run
   ```

6. **Verify deployment**
   - Frontend: http://your-domain:3000
   - Backend API: http://your-domain:3000/api
   - Swagger UI: http://your-domain:3000/api/docs

## Environment Configuration

### Critical Variables (Required)

These variables MUST be configured before deployment:

#### Application

- `APP_ENVIRONMENT`: Must be `'self-hosted'` for self-hosted deployments
- `PORT`: Internal container port (default: 3000)
- `FRONTEND_BASEURL`: Full URL of frontend (with https:// or http://)
- `ADMIN_TOKEN`: Secure token for admin API endpoints

#### Authentication

- `JWT_SECRET`: Secure random string for signing JWT tokens
  ```bash
  openssl rand -hex 32
  ```
- `COOKIE_SECRET`: Secure random string for signing cookies
  ```bash
  openssl rand -hex 32
  ```
- `COOKIE_SECURE`: Set to `true` in production (requires HTTPS)

#### Database

- `POSTGRES_HOST`: Database hostname
- `POSTGRES_PORT`: Database port (default: 5432)
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Secure database password
- `POSTGRES_DB`: Database name

#### MCP Integration (Required)

- `MCP_ENCRYPTION_KEY`: 64-character hex string for encrypting credentials
  ```bash
  openssl rand -hex 32
  ```
  - Must be set before starting the application
  - Application will fail to start if invalid
  - Used for AES-256-GCM encryption of MCP credentials

- `LOCABOO_4_URL`: Base URL of Locaboo 4 MCP server (if using Locaboo integration)
  - Example: `http://localhost:8080` or `https://locaboo.your-domain.com`

#### Model Providers

At least one must be configured:

- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `MISTRAL_API_KEY`: Mistral API key
- `OLLAMA_BASE_URL`: Ollama server URL

### Optional Variables

- `DISABLE_REGISTRATION`: Set to `true` to disable new user registration
- `SMTP_*`: Email configuration (see README.md)
- `BRAVE_SEARCH_*`: Web search functionality
- `MINIO_*`: File storage configuration

### Validation Checklist

Before starting the application:

- [ ] `JWT_SECRET` is a secure random string
- [ ] `COOKIE_SECRET` is a secure random string
- [ ] `MCP_ENCRYPTION_KEY` is set and is 64 hex characters
- [ ] `POSTGRES_*` variables point to valid database
- [ ] `FRONTEND_BASEURL` is set correctly
- [ ] At least one LLM provider is configured
- [ ] `COOKIE_SECURE=true` if using HTTPS (production requirement)
- [ ] All variables are escaped properly if containing special characters

## Database Migrations

### Running Migrations

Migrations are applied automatically on application start in most configurations. To manually run:

```bash
cd ayunis-core-backend
npm run migration:run
```

### Checking Migration Status

```bash
cd ayunis-core-backend
npm run migration:show
```

### Rolling Back Migrations

If needed, revert the last migration:

```bash
cd ayunis-core-backend
npm run migration:revert
```

### Creating Custom Migrations

For schema changes, TypeORM generates migrations:

```bash
cd ayunis-core-backend
npm run migration:generate "DescriptiveName"
```

Always review generated migrations before committing.

## MCP Integration Setup

### MCP v2 Simplified Authentication

Ayunis Core uses a simplified authentication approach for MCP integrations:

#### Supported Authentication Types

1. **NO_AUTH**: Public MCP servers requiring no authentication
2. **BEARER_TOKEN**: Simple API keys or tokens (e.g., Locaboo 3 API tokens)
3. **OAUTH**: Reserved for future standard OAuth 2.1 implementations

#### Locaboo 4 Integration Deployment

If deploying with Locaboo 4 integration:

1. **Configure Locaboo 4 MCP server** (external to Ayunis)
   - Ensure Locaboo 4 is running and accessible
   - Note the base URL (e.g., `http://locaboo-server:8080`)

2. **Set LOCABOO_4_URL in environment**
   ```bash
   LOCABOO_4_URL=http://locaboo-server:8080
   ```

3. **Create integration in admin UI**
   - Go to Admin Settings → Integrations → MCP
   - Click "Create Predefined Integration"
   - Select "Locaboo 4"
   - Provide Locaboo 3 API token
   - Test connection

4. **Enable integration for organizations**
   - Each organization admin must enable the integration
   - Users can then use Locaboo data in agents

#### Credential Encryption

All MCP credentials are encrypted at rest:

- Algorithm: AES-256-GCM
- Key: `MCP_ENCRYPTION_KEY` environment variable
- IV: Random per credential
- Output: Base64-encoded (IV + ciphertext + auth tag)

Encryption happens transparently; no application code changes needed for key rotation.

### Token Management

- **No automatic refresh**: Bearer tokens are stored and used as-is
- **Manual rotation**: Users can update tokens through the UI
- **Encryption key rotation**: See [Rotating MCP_ENCRYPTION_KEY](#rotating-mcp_encryption_key) below

## Configuration Updates

### Updating Environment Variables

1. **Edit environment file**
   ```bash
   nano ayunis-core-backend/.env
   ```

2. **Restart application**
   ```bash
   docker compose restart ayunis-core-backend
   ```

3. **Verify changes**
   - Check logs: `docker compose logs ayunis-core-backend`
   - Test functionality through UI or API

### Adding New Model Providers

Models are registered via the admin API, not environment variables.

```bash
curl -X POST http://localhost:3000/api/admin/language-models \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "gpt-4",
    "provider": "openai",
    "displayName": "GPT-4",
    "canStream": true,
    "canUseTools": true
  }'
```

Then restart the backend for changes to take effect.

### Rotating MCP_ENCRYPTION_KEY

MCP_ENCRYPTION_KEY can be rotated without data loss:

1. **Generate new key**
   ```bash
   openssl rand -hex 32
   ```

2. **Update environment**
   ```bash
   # Update ayunis-core-backend/.env
   MCP_ENCRYPTION_KEY=<new-64-char-hex-string>
   ```

3. **Restart application**
   ```bash
   docker compose restart ayunis-core-backend
   ```

4. **Decrypt with new key**: No action needed
   - Encrypted values in database were encrypted with old key
   - Application automatically decrypts with new key on first access
   - Note: Decryption will fail if old encrypted values exist and don't match new key
   - For seamless rotation, re-encrypt credentials before changing key

**Important**: Keep the old key available until all integrations are re-tested.

## Configuration Validation

The application validates critical configuration on startup:

### MCP Configuration Validation

```typescript
// MCP_ENCRYPTION_KEY validation (McpCredentialEncryptionService)
- Must be set and not empty
- Must be exactly 64 hexadecimal characters
- Must represent exactly 32 bytes
```

If validation fails:

```
MCP_ENCRYPTION_KEY environment variable is not configured. Generate a key with: openssl rand -hex 32
```

or

```
MCP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate a key with: openssl rand -hex 32
```

### Resolving Validation Failures

1. **Check configuration**
   ```bash
   # Verify key format
   echo $MCP_ENCRYPTION_KEY | wc -c  # Should be 65 (64 chars + newline)
   echo $MCP_ENCRYPTION_KEY | grep -E '^[0-9a-fA-F]{64}$'  # Should match
   ```

2. **Generate new key**
   ```bash
   openssl rand -hex 32
   ```

3. **Update environment and restart**
   ```bash
   docker compose restart ayunis-core-backend
   ```

## Backups

### Setup

Backups are handled by `scripts/backup.sh`, which dumps Postgres and tars the MinIO volume. Run it on the host via cron.

**1. Configure cron (daily at 3 AM):**

```bash
crontab -e
```

Add this line (adjust the path to your checkout):

```
0 3 * * * . /opt/ayunis/ayunis-core/ayunis-core-backend/.env && /opt/ayunis/ayunis-core/scripts/backup.sh >> /var/log/ayunis-backup.log 2>&1
```

**2. (Recommended) Off-site copies with Hetzner Storage Box:**

Order a [Storage Box](https://www.hetzner.com/storage/storage-box/) and configure SSH key access, then set `BACKUP_REMOTE` in your cron entry:

```
0 3 * * * . /opt/ayunis/ayunis-core/ayunis-core-backend/.env && BACKUP_REMOTE="u123456@u123456.your-storagebox.de:backups/" /opt/ayunis/ayunis-core/scripts/backup.sh >> /var/log/ayunis-backup.log 2>&1
```

**3. Verify backups are running:**

```bash
# Check the log
tail -20 /var/log/ayunis-backup.log

# List local backups
ls -lh /opt/ayunis/backups/
```

### Restore

```bash
# Source your env vars
source /opt/ayunis/ayunis-core/ayunis-core-backend/.env

# List available backups and restore interactively
./scripts/restore.sh
```

### Configuration

| Variable | Default | Description |
|---|---|---|
| `BACKUP_DIR` | `/opt/ayunis/backups` | Local backup directory |
| `BACKUP_RETENTION` | `30` | Days to keep old backups |
| `BACKUP_REMOTE` | (none) | rsync target for off-site copies |

## Monitoring and Maintenance

### Health Checks

- **Frontend**: http://your-domain/health (Vite dev mode only)
- **Backend**: http://your-domain/api/health
- **MCP integrations**: Check via `/api/mcp-integrations` endpoint

### Logs

```bash
# View backend logs
docker compose logs -f ayunis-core-backend

# View frontend logs
docker compose logs -f ayunis-core-frontend

# View all logs
docker compose logs -f
```

### Database Maintenance

Periodically check database:

```bash
# Connect to database
docker compose exec postgres psql -U postgres -d ayunis

# Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Troubleshooting

### Application fails to start

**Check MCP encryption key**:
```bash
docker compose logs ayunis-core-backend | grep -i "encryption"
```

**Verify environment variables**:
```bash
docker exec ayunis-core-backend env | grep -E "(MCP|JWT|COOKIE|POSTGRES)"
```

### Database connection fails

1. Verify PostgreSQL is running
2. Check `POSTGRES_*` variables
3. Ensure database exists: `docker compose exec postgres createdb -U postgres ayunis`

### MCP integrations don't work

1. Verify `MCP_ENCRYPTION_KEY` is set
2. Check MCP server URL is accessible
3. Verify credentials are correct (test through admin UI)
4. Check logs for specific error messages

### Performance issues

1. Check database query performance
2. Monitor disk space for file storage and embeddings
3. Consider scaling PostgreSQL or MinIO separately

### Security concerns

1. Always use HTTPS in production (`COOKIE_SECURE=true`)
2. Rotate `JWT_SECRET` and `COOKIE_SECRET` periodically
3. Use strong, unique `ADMIN_TOKEN`
4. Regularly rotate `MCP_ENCRYPTION_KEY`
5. Keep secrets in environment variables, never in code
6. Use separate `.env` file for production (never commit to git)

## Support

For issues or questions:

1. Check application logs: `docker compose logs`
2. Review environment configuration
3. Consult the main [README.md](README.md)
4. Open an issue on GitHub with logs (redacting sensitive data)
