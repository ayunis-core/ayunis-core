# TICKET-005: Implement MCP Client Adapter

## Description

Create an adapter that wraps the official `@modelcontextprotocol/sdk` to provide MCP client functionality. This includes defining the port interface and implementing the concrete adapter using SSE transport with on-demand connection strategy (create connection per request, close immediately after).

**Why**: The MCP client is responsible for communicating with external MCP servers. The adapter pattern allows us to abstract the SDK details behind a port interface, making it easier to test and potentially swap implementations.

**Technical Approach**:
1. Define `McpClientPort` abstract class with methods for all MCP operations
2. Implement `McpSdkClientAdapter` using `@modelcontextprotocol/sdk`
3. Use `SSEClientTransport` for HTTP/SSE connections
4. Implement on-demand connection strategy (connect → execute → close)
5. Add 30-second timeout enforcement on all operations

## Acceptance Criteria

- [x] `@modelcontextprotocol/sdk` package added to dependencies in `package.json` (version `^1.20.2`)
- [x] `McpClientPort` abstract class created in `src/domain/mcp/application/ports/mcp-client.port.ts`
- [x] Port defines `McpConnectionConfig` interface with: `serverUrl`, `authHeaderName?`, `authToken?`
- [x] Port defines methods: `listTools()`, `listResources()`, `listPrompts()`, `callTool()`, `readResource()`, `getPrompt()`, `validateConnection()`
- [x] `McpSdkClientAdapter` created in `src/domain/mcp/infrastructure/clients/mcp-sdk-client.adapter.ts`
- [x] Adapter implements all port methods using official SDK
- [x] Adapter uses `SSEClientTransport` from SDK
- [x] Each method creates new client connection at start
- [x] Each method closes client connection in `finally` block
- [x] All operations enforce 30-second timeout using `Promise.race()`
- [x] `validateConnection()` attempts to connect and list capabilities, returns success/error
- [x] Adapter handles authentication headers (only adds headers if auth is provided)
- [x] Adapter is registered as provider in `McpModule`
- [x] Unit tests added for:
  - `listTools()` successfully connects and returns tools
  - `listResources()` successfully connects and returns resources
  - `listPrompts()` successfully connects and returns prompts
  - `callTool()` successfully executes tool and returns result
  - `callTool()` returns error result when tool execution fails
  - `readResource()` fetches static resource successfully
  - `readResource()` fetches parameterized resource with arguments
  - `getPrompt()` retrieves prompt successfully
  - `validateConnection()` returns valid=true for working server
  - `validateConnection()` returns valid=false with error for unreachable server
  - Timeout is enforced (operations exceeding 30s are rejected)
  - Connection is closed even when operation throws error
  - Authentication headers are included when provided
  - No authentication headers are added when auth is not provided

## Dependencies

None - this is a foundation ticket

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Large

## Technical Notes

**Files to create**:
- `src/domain/mcp/application/ports/mcp-client.port.ts`
- `src/domain/mcp/infrastructure/clients/mcp-sdk-client.adapter.ts`

**Files to modify**:
- `src/domain/mcp/mcp.module.ts` (register adapter as provider)
- `ayunis-core-backend/package.json` (add @modelcontextprotocol/sdk dependency)

**Port Interface**:
```typescript
export interface McpConnectionConfig {
  serverUrl: string;
  authHeaderName?: string;
  authToken?: string;
}

export interface McpToolCall {
  toolName: string;
  parameters: Record<string, unknown>;
}

export interface McpToolResult {
  content: unknown;
  isError: boolean;
}

export abstract class McpClientPort {
  abstract listTools(config: McpConnectionConfig): Promise<McpTool[]>;
  abstract listResources(config: McpConnectionConfig): Promise<McpResource[]>;
  abstract listPrompts(config: McpConnectionConfig): Promise<McpPrompt[]>;
  abstract callTool(config: McpConnectionConfig, call: McpToolCall): Promise<McpToolResult>;
  abstract readResource(config: McpConnectionConfig, uri: string, parameters?: Record<string, unknown>): Promise<{ content: string; mimeType: string }>;
  abstract getPrompt(config: McpConnectionConfig, name: string, args: Record<string, unknown>): Promise<{ messages: unknown[] }>;
  abstract validateConnection(config: McpConnectionConfig): Promise<{ valid: boolean; error?: string }>;
}
```

**Connection Strategy**:
```typescript
private async createClient(config: McpConnectionConfig): Promise<Client> {
  const headers: Record<string, string> = {};
  if (config.authHeaderName && config.authToken) {
    headers[config.authHeaderName] = config.authToken;
  }

  const transport = new SSEClientTransport(new URL(config.serverUrl), {
    requestInit: { headers },
  });

  const client = new Client(
    { name: 'ayunis-core', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  await client.connect(transport);
  return client;
}
```

**Timeout Pattern**:
```typescript
private timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('MCP request timeout')), ms)
  );
}

// Usage:
const result = await Promise.race([
  client.callTool(toolName, parameters),
  this.timeoutPromise(30000),
]);
```

**Module Registration**:
```typescript
// In mcp.module.ts
providers: [
  {
    provide: McpClientPort,
    useClass: McpSdkClientAdapter,
  },
]
```

**Testing Approach**:
- Mock MCP server for integration tests (use test utilities from SDK if available)
- Unit test timeout enforcement
- Unit test connection lifecycle (create → use → close)
- Test error handling (network errors, invalid responses)
- Test authentication header injection
