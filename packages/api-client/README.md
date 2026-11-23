# Ayunis API client

`@ayunis/api-client` contains the canonical OpenAPI schema, generated endpoint
functions, React Query hooks and DTOs. It is consumed as a source package.

Each app configures a transport before mounting. Cookie sessions set
`credentials: 'include'`. Token sessions set `credentials: 'omit'` and
supply an authorization header and, when available, a refresh callback.
`apiFetch` in `@ayunis/api-client/transport` uses the same transport for streaming.

To fetch and regenerate against a running backend:

```bash
VITE_API_BASE_URL=http://localhost:3000/api pnpm --filter @ayunis/api-client openapi:update
```

`pnpm --filter @ayunis/api-client openapi:generate` regenerates from the
committed schema. Commit the generated files with API changes. The schema
also drives the Playwright client.
