# Frontend API integration

The [workspace API client](../../../../packages/api-client/README.md) owns the
OpenAPI schema, generated requests and React Query hooks. Import them from
`@ayunis/api-client`.

The web and Outlook entry points supply the transport before mounting the
app. This directory owns deploy-gap retries, request error diagnostics,
error parsing, and common query parameters.

From the frontend directory, `pnpm run openapi:update` reads the API base URL
from the local environment and delegates regeneration to the package.
