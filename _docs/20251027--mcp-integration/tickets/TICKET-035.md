# TICKET-035: Documentation and Testing Polish

## Description

Final polish phase for the MCP integration feature, including comprehensive documentation, logging refinement, error handling improvements, and integration testing preparation. This ticket ensures the feature is production-ready with clear documentation for admins and users.

**Why**: A complete feature requires more than just working code - it needs documentation for users and operators, robust logging for troubleshooting, and clear error messages for end-users.

**Technical Approach**:
1. Review and refine all error messages for clarity
2. Add comprehensive logging throughout MCP flows
3. Write admin documentation for MCP integration setup
4. Write user documentation for agent assignment
5. Document common troubleshooting scenarios
6. Add health check endpoint for MCP connectivity
7. Prepare integration testing strategy (deferred execution)

## Acceptance Criteria

### Error Handling Refinement

- [ ] All MCP errors include integration name and ID in messages
- [ ] Error messages are user-friendly and actionable
- [ ] Timeout errors include helpful guidance ("Check MCP server status")
- [ ] Authentication errors clearly state credential issues
- [ ] Validation errors specify which field/configuration is invalid
- [ ] Unit tests verify error message clarity and consistency

### Logging Enhancement

- [ ] All MCP operations logged with consistent format: `[MCP] operation=X integration=Y status=Z duration=Nms`
- [ ] Discovery operations log: integration ID, capabilities found (tools/resources/prompts counts)
- [ ] Tool executions log: integration ID, tool name, success/failure, duration
- [ ] Resource retrievals log: integration ID, resource URI, MIME type, success/failure
- [ ] Connection failures log: integration ID, server URL (redacted), error type
- [ ] Credential operations NEVER logged (even encrypted values)
- [ ] All logs use structured format for easy parsing/monitoring
- [ ] Unit tests verify logging occurs for all operations

### Health Check Endpoint

- [ ] Endpoint created: `GET /api/health/mcp`
- [ ] Returns 200 if at least one integration is healthy
- [ ] Returns 503 if all integrations are failing
- [ ] Response includes: `{ status: "healthy" | "unhealthy", integrations: [...] }`
- [ ] Each integration includes: ID, name, status (healthy/unhealthy), lastChecked timestamp
- [ ] Health checks use cached results (not live validation) to avoid overload
- [ ] Endpoint accessible without authentication (for monitoring tools)
- [ ] Unit tests verify response format and status codes

### Admin Documentation

- [ ] Setup guide created: `docs/admin/mcp-integration-setup.md`
- [ ] Guide includes:
  - Overview of MCP integration feature
  - Step-by-step setup for predefined integrations
  - Step-by-step setup for custom integrations
  - Authentication methods explained (API key, Bearer token)
  - Validation process and troubleshooting tips
  - Security best practices for credentials
- [ ] Common troubleshooting section with error codes and solutions
- [ ] Examples of popular MCP servers (if any available)
- [ ] Screenshots or diagrams showing admin UI workflow

### User Documentation

- [ ] User guide created: `docs/users/mcp-agent-assignment.md`
- [ ] Guide includes:
  - What MCP integrations enable
  - How to assign integrations to agents
  - How integrations appear during conversations
  - Examples of MCP tools, resources, and prompts in use
  - Troubleshooting when integrations fail
- [ ] Screenshots showing agent configuration UI
- [ ] Example conversations demonstrating MCP capabilities

### Troubleshooting Documentation

- [ ] Troubleshooting guide created: `docs/troubleshooting/mcp-integration.md`
- [ ] Covers common issues:
  - "Integration validation failed" - possible causes and fixes
  - "MCP tool execution timeout" - server responsiveness checks
  - "Authentication failed" - credential verification steps
  - "CSV resource processing failed" - file format issues
  - Integration-specific errors and resolutions
- [ ] Includes diagnostic commands (check logs, validate manually)
- [ ] Links to MCP protocol documentation for advanced debugging

### Integration Testing Strategy

- [ ] Integration testing plan documented in `docs/testing/mcp-integration-tests.md`
- [ ] Plan includes:
  - Test MCP server setup instructions (mock/test server)
  - Scenarios to test (create integration, assign to agent, execute tool, retrieve resource)
  - Expected outcomes for each scenario
  - Instructions for running integration tests (deferred - test infrastructure ticket)
- [ ] Note: Actual integration test execution deferred to future ticket (test infrastructure needed)

### Code Review Checklist

- [ ] All use cases have consistent error handling patterns
- [ ] All controllers have proper OpenAPI documentation
- [ ] All domain errors have clear messages
- [ ] All database migrations are reversible (up/down)
- [ ] No hardcoded values (all configuration in env or registry)
- [ ] No TODO comments left in production code
- [ ] All public methods have JSDoc comments

## Dependencies

- TICKET-028 (MCP discovery integration)
- TICKET-029 (MCP tool execution)
- TICKET-030 (MCP resource retrieval)
- TICKET-031 (MCP prompt retrieval)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Medium

## Technical Notes

**Files to create**:
- `docs/admin/mcp-integration-setup.md`
- `docs/users/mcp-agent-assignment.md`
- `docs/troubleshooting/mcp-integration.md`
- `docs/testing/mcp-integration-tests.md`
- `src/domain/mcp/presenters/http/health.controller.ts` (health check endpoint)

**Files to review**:
- All use cases for error handling consistency
- All controllers for OpenAPI documentation completeness
- All error classes for message clarity

**Logging Format Standard**:
```typescript
this.logger.log('[MCP] operation=discover integration=${integrationId} status=success tools=${toolCount} resources=${resourceCount} prompts=${promptCount} duration=${duration}ms');
this.logger.error('[MCP] operation=execute_tool integration=${integrationId} tool=${toolName} status=error error=${error.message} duration=${duration}ms');
```

**Health Check Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T12:00:00Z",
  "integrations": [
    {
      "id": "uuid-123",
      "name": "Test Integration",
      "type": "predefined",
      "status": "healthy",
      "lastChecked": "2025-10-28T11:59:00Z"
    }
  ]
}
```

**Error Message Improvement Examples**:

Before:
```
"Failed to connect to MCP server"
```

After:
```
"Failed to connect to MCP integration 'GitHub MCP' (ID: abc-123). Please verify the server URL is correct and the server is running. Error: ECONNREFUSED"
```

**Documentation Structure**:
- Use markdown format
- Include table of contents
- Add code examples and screenshots
- Link to official MCP protocol docs
- Keep language clear and non-technical for user docs
- Include troubleshooting flowcharts/decision trees

**Integration Testing Strategy** (Documented, Not Executed):
```markdown
# MCP Integration Testing Strategy

## Test Server Setup
- Use @modelcontextprotocol/sdk test utilities
- Configure test server on localhost:3100
- Implement sample tools: "echo", "calculate", "get_data"
- Implement sample resources: CSV file, text file

## Test Scenarios
1. Create predefined integration → Validate → Assign to agent → Execute tool
2. Create custom integration → Validate → Discovery → Check tools available
3. Retrieve CSV resource → Verify data source created → Query via RAG
4. Error scenarios: Invalid URL, wrong credentials, timeout

## Note
Actual test execution requires test infrastructure setup (separate ticket).
This strategy document guides future implementation.
```

**Review Checklist Items**:
- Verify all HTTP endpoints have @ApiOperation and @ApiResponse
- Check all use cases follow ContextService pattern
- Ensure all DTOs have class-validator decorators
- Confirm all errors extend ApplicationError
- Validate all migrations have up() and down() methods
- Review all TODOs and FIXMEs are resolved

**Success Criteria**:
- Admin can set up integration using only documentation (no developer help)
- User can assign integration using only documentation
- Logs provide enough context for troubleshooting
- Health check enables monitoring and alerting
- Error messages are clear and actionable
- Integration testing strategy is clear for future implementation
