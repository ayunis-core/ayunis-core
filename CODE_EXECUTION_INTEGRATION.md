# Code Execution Service Integration

This document describes how the backend integrates with the code execution service using OpenAPI specifications and ORVAL-generated clients.

## Architecture Overview

The integration follows the same pattern as the frontend-backend integration:

1. **Code Execution Service (FastAPI)**: Generates OpenAPI specifications
2. **Backend (NestJS)**: Uses ORVAL to generate TypeScript clients from the OpenAPI specs
3. **Generated Client**: Provides type-safe API calls to the code execution service

## Setup Components

### 1. FastAPI OpenAPI Configuration

The code execution service (`ayunis-core-code-execution/server.py`) is configured with:

```python
app = FastAPI(
    title="Ayunis Code Execution Service",
    description="A secure Python code execution service with Docker sandboxing",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
```

This exposes:

- OpenAPI JSON schema at: `http://localhost:8080/openapi.json`
- Interactive docs at: `http://localhost:8080/docs`
- ReDoc documentation at: `http://localhost:8080/redoc`

### 2. ORVAL Configuration

The backend includes an ORVAL configuration (`orval.config.ts`) that:

```typescript
export default defineConfig({
  codeExecution: {
    input: {
      target: "http://localhost:8080/openapi.json",
    },
    output: {
      target: "./src/common/clients/code-execution/generated",
      client: "axios",
      mode: "split",
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: "./src/common/clients/code-execution/client.ts",
          name: "codeExecutionAxiosInstance",
        },
      },
    },
  },
});
```

### 3. Axios Client Configuration

The custom axios instance (`src/common/clients/code-execution/client.ts`) provides:

- Base URL configuration (defaults to `http://localhost:8080`)
- 60-second timeout for code execution
- Request/response interceptors
- Error handling

### 4. Generated Client

ORVAL generates TypeScript clients in `src/common/clients/code-execution/generated/`:

- `ayunisCodeExecutionService.ts`: API methods
- `ayunisCodeExecutionService.schemas.ts`: TypeScript interfaces

### 5. Integration in Tool Handler

The `CodeExecutionToolHandler` uses the generated client:

```typescript
import { getAyunisCodeExecutionService } from "../../../../common/clients/code-execution/generated/ayunisCodeExecutionService";
import type { ExecutionRequest } from "../../../../common/clients/code-execution/generated/ayunisCodeExecutionService.schemas";

// In execute method:
const codeExecutionService = getAyunisCodeExecutionService();
const response = await codeExecutionService.executeCodeExecutePost(
  executionRequest,
);
```

## Usage

### 1. Start the Code Execution Service

```bash
cd ayunis-core-code-execution
python -m uvicorn server:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Generate/Update the Client

When the code execution service API changes, regenerate the client:

```bash
cd ayunis-core-backend
npm run generate:client
```

### 3. Environment Configuration

Set the code execution service URL (optional, defaults to localhost):

```bash
export CODE_EXECUTION_SERVICE_URL=http://localhost:8080
```

## Benefits

1. **Type Safety**: Full TypeScript support with generated interfaces
2. **Automatic Updates**: Easy regeneration when API changes
3. **Consistent Pattern**: Same approach as frontend-backend integration
4. **Error Handling**: Centralized error handling in the axios client
5. **Documentation**: OpenAPI specs provide interactive documentation

## Development Workflow

1. Make changes to the FastAPI service
2. Restart the service to update OpenAPI specs
3. Run `npm run generate:client` in the backend
4. Use the updated client methods with full type safety

## Troubleshooting

### Client Generation Issues

- Ensure the code execution service is running on the expected port
- Check that the OpenAPI endpoint is accessible: `curl http://localhost:8080/openapi.json`
- Verify ORVAL configuration paths are correct

### Runtime Issues

- Check the `CODE_EXECUTION_SERVICE_URL` environment variable
- Verify network connectivity between backend and code execution service
- Check axios timeout settings for long-running code executions
