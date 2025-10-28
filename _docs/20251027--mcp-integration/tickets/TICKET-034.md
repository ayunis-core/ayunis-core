# TICKET-034: Regenerate Frontend API Client

## Description

Regenerate the frontend TypeScript API client using Orval to include the new MCP integration endpoints. This ticket involves running the Orval code generation tool to create TypeScript hooks and types from the backend's updated OpenAPI specification.

This ticket is a prerequisite for all frontend UI implementation work, as it generates the API hooks that will be used in TICKET-032 and TICKET-033.

**What needs to be built:**
- Run `npm run openapi:update` to regenerate the API client
- Verify that all expected MCP-related hooks are generated
- Verify that all DTO types are correctly generated
- Ensure no breaking changes to existing API hooks

**Why it's needed:**
The backend API has been extended with new MCP integration endpoints (TICKET-026, TICKET-027). The frontend needs the corresponding TypeScript client code to interact with these endpoints in a type-safe manner.

**Technical approach:**
1. Ensure backend is running with all MCP endpoints implemented
2. Run Orval code generation command
3. Verify generated files in `src/shared/api/generated/`
4. Check for any generation errors or warnings
5. Review generated types for correctness

## Acceptance Criteria

- [ ] Backend API is running with all MCP endpoints available (TICKET-026, TICKET-027 completed)
- [ ] Command `npm run openapi:update` executes successfully in `ayunis-core-frontend/` directory
- [ ] All expected MCP integration hooks are generated in `src/shared/api/generated/`:
  - `useCreatePredefinedIntegration` (POST /api/mcp-integrations/predefined)
  - `useCreateCustomIntegration` (POST /api/mcp-integrations/custom)
  - `useListOrgIntegrations` (GET /api/mcp-integrations)
  - `useGetIntegration` (GET /api/mcp-integrations/:id)
  - `useUpdateIntegration` (PATCH /api/mcp-integrations/:id)
  - `useDeleteIntegration` (DELETE /api/mcp-integrations/:id)
  - `useEnableIntegration` (POST /api/mcp-integrations/:id/enable)
  - `useDisableIntegration` (POST /api/mcp-integrations/:id/disable)
  - `useValidateIntegration` (POST /api/mcp-integrations/:id/validate)
  - `useListPredefinedConfigs` (GET /api/mcp-integrations/predefined-configs)
- [ ] All expected Agent MCP assignment hooks are generated:
  - `useGetAgentMcpIntegrations` (GET /api/agents/:agentId/mcp-integrations)
  - `useGetAvailableMcpIntegrations` (GET /api/agents/:agentId/mcp-integrations/available)
  - `useAssignMcpIntegrationToAgent` (POST /api/agents/:agentId/mcp-integrations/:integrationId)
  - `useUnassignMcpIntegrationFromAgent` (DELETE /api/agents/:agentId/mcp-integrations/:integrationId)
- [ ] All DTO types are generated correctly:
  - `CreatePredefinedIntegrationDto`
  - `CreateCustomIntegrationDto`
  - `UpdateMcpIntegrationDto`
  - `McpIntegrationResponseDto`
  - `PredefinedConfigDto`
  - `ValidationResultDto`
  - `McpAuthConfigDto` and variants
- [ ] No breaking changes introduced to existing API hooks (verify by running build)
- [ ] Frontend build succeeds: `npm run build` completes without errors
- [ ] No TypeScript errors in generated files: `npx tsc --noEmit` passes

## Dependencies

- TICKET-026 (MCP Integration Admin API Endpoints - must be completed first)
- TICKET-027 (Agent MCP Assignment API Endpoints - must be completed first)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Small

## Technical Notes

**File paths:**
- Orval config: `ayunis-core-frontend/orval.config.ts`
- Generated output: `ayunis-core-frontend/src/shared/api/generated/`
- Command location: `ayunis-core-frontend/package.json` (script: `openapi:update`)

**Prerequisites:**
- Backend must be running on `http://localhost:3000`
- OpenAPI spec must be available at `http://localhost:3000/api/docs-json`

**Verification commands:**
```bash
cd ayunis-core-frontend
npm run openapi:update
npm run build
npx tsc --noEmit
```

**Common issues:**
- If backend is not running, Orval will fail to fetch OpenAPI spec
- Check `orval.config.ts` for correct backend URL
- Generated files should not be manually edited (they will be overwritten)

**Generated hook usage example:**
```typescript
import { useCreatePredefinedIntegration } from '@/shared/api/generated/mcp-integrations';

const createIntegrationMutation = useCreatePredefinedIntegration({
  mutation: {
    onSuccess: (data) => {
      console.log('Integration created:', data);
    },
    onError: (error) => {
      console.error('Failed to create integration:', error);
    },
  },
});
```
