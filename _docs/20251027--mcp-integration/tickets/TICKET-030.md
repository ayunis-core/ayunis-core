# TICKET-030: Integrate MCP Resource Retrieval in Runs

## Description

Add MCP resource retrieval capability to the runs module orchestration flow. When the LLM requests a resource (via special tool call or mechanism), retrieve it from the MCP server. CSV resources are automatically imported as thread data sources, while text resources are returned directly to the LLM. Resources support parameterized URIs for dynamic queries.

**Why**: Agent conversations need to access MCP resources (datasets, files, configuration) during execution. CSV resources become queryable data sources, while other resource types provide direct content.

**Technical Approach**:
1. Add a special "retrieve_mcp_resource" native tool to the tools array
2. When LLM calls this tool, extract resource URI and integration ID from parameters
3. Call `RetrieveMcpResourceUseCase` with integration ID, resource URI, and parameters
4. Handle resource retrieval result based on resource type (CSV vs text)
5. For CSV: resource is imported as data source (side effect), return success message
6. For text: return resource content directly as tool result
7. Handle errors gracefully (return error message to LLM)
8. Log all resource retrievals with integration ID and URI

## Acceptance Criteria

- [ ] New native tool "retrieve_mcp_resource" added to tools assembly in `ExecuteRunUseCase`
- [ ] Tool schema includes: `resourceUri` (string, required), `integrationId` (string, required), `parameters` (object, optional)
- [ ] Tool description explains resource retrieval and automatic CSV import
- [ ] Tool is always available when agent has MCP integrations
- [ ] `RetrieveMcpResourceUseCase` injected into `ExecuteRunUseCase`
- [ ] Tool execution routes to new `executeMcpResourceRetrieval()` method
- [ ] `executeMcpResourceRetrieval()` calls `RetrieveMcpResourceUseCase`
- [ ] CSV resource retrieval returns success message: "CSV resource imported as data source: {resourceUri}"
- [ ] Text resource retrieval returns content directly as string
- [ ] Resource retrieval errors returned to LLM (not thrown)
- [ ] Error message format: "Resource retrieval failed: {errorMessage}"
- [ ] Parameterized resource URIs supported (parameters passed to use case)
- [ ] Resource retrieval logged with integration ID, URI, and result status
- [ ] Tool result includes resource URI and operation status
- [ ] Unit tests added for:
  - Successfully retrieves CSV resource and returns success message
  - Successfully retrieves text resource and returns content
  - Handles parameterized resource URIs correctly
  - Returns error to LLM when resource retrieval fails
  - Returns error when integration ID missing from parameters
  - Returns error when resource URI missing from parameters
  - Logs resource retrievals with correct metadata
  - Tool parameters validated (resourceUri and integrationId required)

## Dependencies

- TICKET-019 (Retrieve MCP Resource Use Case)
- TICKET-028 (MCP capabilities available in orchestration context)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Large

## Technical Notes

**Files to modify**:
- `src/domain/runs/application/use-cases/execute-run/execute-run.use-case.ts` - Add resource retrieval tool and logic

**Add Resource Retrieval Tool**:
```typescript
private async assembleTools(thread: Thread, mcpTools: Tool[]): Promise<Tool[]> {
  const tools: Tool[] = [];

  // ... existing tool assembly logic ...

  // NEW: Add MCP resource retrieval tool if agent has MCP integrations
  if (thread.agent && thread.agent.mcpIntegrationIds?.length > 0) {
    tools.push(this.createMcpResourceRetrievalTool());
  }

  return tools;
}

// NEW: Create MCP resource retrieval tool
private createMcpResourceRetrievalTool(): Tool {
  return new Tool(
    null, // No ID - ephemeral tool
    'retrieve_mcp_resource',
    'Retrieve a resource from an MCP integration. CSV resources are automatically imported as data sources that can be queried with the source_query tool. Text resources return their content directly. Use this when you need to access datasets, files, or configuration from MCP servers.',
    {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'The ID of the MCP integration to retrieve the resource from',
        },
        resourceUri: {
          type: 'string',
          description: 'The URI of the resource to retrieve (e.g., "dataset://sales" or "file://config.json")',
        },
        parameters: {
          type: 'object',
          description: 'Optional parameters for parameterized resource URIs (e.g., {category: "electronics"})',
          additionalProperties: true,
        },
      },
      required: ['integrationId', 'resourceUri'],
    },
    ToolType.MCP_RESOURCE, // NEW tool type
    false, // Not displayable
    true, // Executable
    null, // No org ID
    {}, // No metadata
  );
}
```

**Add ToolType.MCP_RESOURCE**:
```typescript
// src/domain/tools/domain/value-objects/tool-type.enum.ts
export enum ToolType {
  CODE_EXECUTION = 'code_execution',
  WEBSITE_CONTENT = 'website_content',
  SEND_EMAIL = 'send_email',
  CREATE_CALENDAR_EVENT = 'create_calendar_event',
  INTERNET_SEARCH = 'internet_search',
  SOURCE_QUERY = 'source_query',
  MCP_TOOL = 'mcp_tool',
  MCP_RESOURCE = 'mcp_resource', // NEW
}
```

**Modify collectToolResults for resource retrieval**:
```typescript
private async collectToolResults(params: {
  thread: Thread;
  tools: Tool[];
  input: RunToolResultInput | null;
  trace: LangfuseTraceClient;
  orgId: UUID;
}): Promise<ToolResultMessageContent[]> {
  // ... existing logic ...

  for (const content of toolUseMessageContent) {
    const tool = tools.find((tool) => tool.name === content.name);
    if (!tool) {
      // ... existing not found logic ...
    }

    try {
      // NEW: Check if this is MCP resource retrieval
      if (tool.type === ToolType.MCP_RESOURCE) {
        const resourceResult = await this.executeMcpResourceRetrieval(
          content,
          params.trace,
          params.thread,
        );
        toolResultMessageContent.push(resourceResult);
        continue; // Skip other tool execution logic
      }

      // Existing MCP tool check
      if (tool.type === ToolType.MCP_TOOL) {
        // ... existing MCP tool logic ...
      }

      // ... existing native tool logic ...
    } catch (error) {
      // ... existing error handling ...
    }
  }

  return toolResultMessageContent;
}

// NEW: Execute MCP resource retrieval
private async executeMcpResourceRetrieval(
  toolUseContent: ToolUseMessageContent,
  trace: LangfuseTraceClient,
  thread: Thread,
): Promise<ToolResultMessageContent> {
  const integrationId = toolUseContent.params.integrationId as string;
  const resourceUri = toolUseContent.params.resourceUri as string;
  const parameters = toolUseContent.params.parameters as Record<string, unknown> | undefined;

  if (!integrationId) {
    this.logger.error('MCP resource retrieval missing integrationId');
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      'Resource retrieval failed: integrationId parameter is required',
    );
  }

  if (!resourceUri) {
    this.logger.error('MCP resource retrieval missing resourceUri');
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      'Resource retrieval failed: resourceUri parameter is required',
    );
  }

  this.logger.log('Retrieving MCP resource', {
    integrationId,
    resourceUri,
    hasParameters: !!parameters,
  });

  const span = trace.span({
    name: 'mcp_resource_retrieval',
    input: { integrationId, resourceUri, parameters },
    metadata: {
      integrationId,
      resourceUri,
      operationType: 'resource_retrieval',
    },
  });

  try {
    // Call retrieve resource use case (returns void for CSV, content for text)
    await this.retrieveMcpResourceUseCase.execute(
      new RetrieveMcpResourceCommand(integrationId, resourceUri, parameters),
    );

    // Resource retrieval succeeded
    // Note: CSV resources are imported as data sources (side effect)
    // Text resources would need different handling (future enhancement)
    this.logger.log('MCP resource retrieval succeeded', {
      integrationId,
      resourceUri,
    });

    span.end({
      output: 'Resource retrieved successfully',
    });

    // For v1, assume CSV resources (imported as data sources)
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      `CSV resource imported as data source: ${resourceUri}. You can now query this data using the source_query tool.`,
    );
  } catch (error) {
    this.logger.error('MCP resource retrieval failed', {
      integrationId,
      resourceUri,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    span.update({
      metadata: {
        isError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    span.end({
      output: 'Resource retrieval failed',
    });

    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      `Resource retrieval failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
```

**Constructor Injection**:
```typescript
constructor(
  // ... existing dependencies ...
  private readonly executeMcpToolUseCase: ExecuteMcpToolUseCase,
  private readonly retrieveMcpResourceUseCase: RetrieveMcpResourceUseCase, // NEW
) {}
```

**Resource Retrieval Flow**:
```
LLM needs MCP resource
  ↓
LLM calls "retrieve_mcp_resource" tool
  ↓
collectToolResults() detects ToolType.MCP_RESOURCE
  ↓
executeMcpResourceRetrieval() extracts parameters
  ↓
RetrieveMcpResourceUseCase.execute()
  ↓
CSV resource? → Create data source (side effect)
  ↓
Return success message to LLM
  ↓
LLM can query data source using source_query tool
```

**Error Handling Pattern**:
- Missing required parameters return error message to LLM
- Resource retrieval errors caught and returned to LLM (not thrown)
- Error transparency: LLM receives error message and can respond intelligently
- All errors logged with integration ID, resource URI, and error message

**Logging Strategy**:
- Log resource retrieval start with integration ID and URI
- Log successful retrieval with integration ID and URI
- Log failed retrieval with integration ID, URI, and error
- Use span tracing for resource retrievals

**Testing Approach**:
- Mock `RetrieveMcpResourceUseCase`
- Test CSV resource retrieval (returns success message)
- Test text resource retrieval (future enhancement)
- Test parameterized resource URIs (parameters passed correctly)
- Test missing required parameters (returns error)
- Test resource retrieval error (returns error to LLM)
- Verify tool is only added when agent has MCP integrations
- Verify logging with correct metadata

**Future Enhancements** (not in this ticket):
- Return text resource content directly instead of just success message
- Support other resource types (JSON, binary files, etc.)
- Add resource caching to avoid redundant retrievals

**Integration Points**:
- TICKET-019: RetrieveMcpResourceUseCase handles actual retrieval
- TICKET-028: Agent's mcpIntegrationIds determine tool availability
- Sources module: CSV resources become queryable data sources
