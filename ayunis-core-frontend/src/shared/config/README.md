# Configuration

This directory contains the application configuration using [Convict](https://github.com/mozilla/node-convict) for type-safe configuration management.

## Usage

```typescript
import config, { isDevelopment } from "@/lib/config";

// Use the config object directly
console.log(config.get("api.baseUrl")); // http://localhost:8000
console.log(config.get("app.name")); // Core Frontend

// Use helper functions
if (isDevelopment()) {
  console.log("Running in development mode");
}

// Get nested configuration
const timeout = config.get("api.timeout");
const devtoolsEnabled = config.get("features.devtools");
```

## Current Integration

The configuration is currently integrated into:

- **API Client** (`src/lib/api/client.ts`) - Uses `api.baseUrl` and `api.timeout`
- **OpenAPI Schema Fetcher** (`src/lib/scripts/fetch-openapi-schema.js`) - Uses `api.baseUrl` with fallback
- **Vite Dev Server** (`vite.config.js`) - Uses `PORT` environment variable

## Environment Variables

The configuration supports the following environment variables:

| Variable               | Description                 | Default                 | Type                                |
| ---------------------- | --------------------------- | ----------------------- | ----------------------------------- |
| `NODE_ENV`             | Application environment     | `development`           | `production`, `development`, `test` |
| `PORT`                 | Server port                 | `3001`                  | number                              |
| `VITE_API_BASE_URL`    | API base URL                | `http://localhost:8000` | URL                                 |
| `VITE_API_TIMEOUT`     | API timeout in milliseconds | `10000`                 | number                              |
| `VITE_APP_NAME`        | Application name            | `Core Frontend`         | string                              |
| `VITE_APP_VERSION`     | Application version         | `1.0.0`                 | string                              |
| `VITE_ENABLE_DEVTOOLS` | Enable development tools    | `false`                 | boolean                             |

## Environment File

Create a `.env` file in the project root to override default values:

```env
VITE_API_BASE_URL=https://api.example.com
VITE_APP_NAME=My App
VITE_ENABLE_DEVTOOLS=true
PORT=3002
```

## Configuration Schema

The configuration is validated using Convict's schema validation. The schema ensures:

- Type safety for all configuration values
- Required environment validation
- Default value fallbacks
- Format validation (URLs, ports, etc.)

## Adding New Configuration

To add new configuration options:

1. Add the new field to the schema in `index.ts`
2. Update this README with the new environment variable
3. Add validation rules as needed

Example:

```typescript
// In the schema
database: {
  host: {
    doc: 'Database host',
    format: String,
    default: 'localhost',
    env: 'VITE_DB_HOST'
  }
}

// Usage
const dbHost = config.get('database.host');
```

## Available Helper Functions

- `isDevelopment()` - Returns true if environment is 'development'
- `isProduction()` - Returns true if environment is 'production'
- `isTest()` - Returns true if environment is 'test'
