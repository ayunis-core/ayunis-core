# API Setup with Orval

This directory contains the API client setup using [Orval](https://orval.dev/) for generating TypeScript types and React Query hooks from OpenAPI specifications.

## Structure

- `client.ts` - Axios instance configuration with interceptors
- `generated/` - Auto-generated API functions and types (do not edit manually)
- `index.ts` - Re-exports all API functions and types for easy importing
- `openapi-schema.json` - OpenAPI specification (fetched from backend)

## Usage

### Import API functions

```typescript
import { useGetUsers, useCreateUser } from "@/lib/api";

// In your component
const { data: users, isLoading } = useGetUsers();
const createUserMutation = useCreateUser();
```

### Import types

```typescript
import type { User, CreateUserDto } from "@/lib/api";
```

## Scripts

- `npm run openapi:fetch` - Fetch the latest OpenAPI schema from the backend
- `npm run openapi:generate` - Generate TypeScript types and React Query hooks
- `npm run openapi:update` - Fetch schema and generate types (recommended)

## Configuration

The API client is configured in `client.ts` with:

- Base URL from config
- Request/response interceptors
- Timeout handling

The Orval configuration is in `orval.config.ts` at the project root.

## Generated Files

The `generated/` directory contains:

- `ayunisCoreAPI.ts` - React Query hooks for all API endpoints
- `ayunisCoreAPI.schemas.ts` - TypeScript types for all schemas

These files are automatically generated and should not be edited manually. They are also gitignored and will be regenerated when needed.
