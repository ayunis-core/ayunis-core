# TICKET-029: Integrate MCP Tool Execution in Runs

## Description

Add MCP tool execution to the runs module orchestration flow. When the LLM calls a tool, determine if it's an MCP tool and route the execution to the MCP module. MCP tools are identified by their tool type and integration metadata. Tool execution errors are returned to the LLM for intelligent handling (error transparency).

**Why**: Agent conversations need to execute MCP tools when the LLM decides to use them. MCP tools are discovered at runtime and coexist with native tools in the same tools array.

**Technical Approach**:
1. Modify `collectToolResults()` method in `ExecuteRunUseCase` to detect MCP tools
2. Check if tool type is `ToolType.MCP_TOOL` (new tool type)
3. If MCP tool, extract integration ID from tool metadata
4. Call `ExecuteMcpToolUseCase` with integration ID, tool name, and parameters
5. Handle `ToolExecutionResult` (success or error)
6. Return result to LLM as tool result message content
7. Log MCP tool executions with integration ID and tool name
8. Handle timeouts and failures gracefully (return error to LLM, don't throw)

## Acceptance Criteria

- [ ] `ToolType.MCP_TOOL` enum value added to `src/domain/tools/domain/value-objects/tool-type.enum.ts`
- [ ] `ExecuteMcpToolUseCase` injected into `ExecuteRunUseCase`
- [ ] `collectToolResults()` method modified to detect MCP tools by type
- [ ] MCP tool detection: `tool.type === ToolType.MCP_TOOL`
- [ ] Integration ID extracted from tool metadata: `tool.metadata.integrationId`
- [ ] `ExecuteMcpToolUseCase` called with integration ID, tool name, and parameters
- [ ] `ToolExecutionResult` handled: success path returns content, error path returns error message
- [ ] MCP tool errors returned to LLM as tool result content (not thrown)
- [ ] Error message format: `"MCP tool execution failed: {errorMessage}"`
- [ ] Success result converted to string for tool result message content
- [ ] Tool result message content includes tool ID, name, and result/error
- [ ] MCP tool execution logged with integration ID, tool name, and result status
- [ ] Timeout errors handled gracefully (return timeout message to LLM)
- [ ] MCP tools coexist with native tools (no changes to native tool execution)
- [ ] Tool not found error still handled for tools not in tools array
- [ ] Unit tests added for:
  - Successfully executes MCP tool and returns result
  - Returns error to LLM when MCP tool execution fails
  - Returns error to LLM when MCP tool times out
  - Handles MCP tool alongside native tools in same iteration
  - Continues loop after MCP tool execution (doesn't exit)
  - Logs MCP tool executions with correct metadata
  - Extracts integration ID from tool metadata correctly
  - Converts tool execution result to string for message content

## Dependencies

- TICKET-018 (Execute MCP Tool Use Case)
- TICKET-028 (MCP tools available in tools array)

## Status

- [x] To Do
- [ ] In Progress
- [ ] Done

## Complexity

Large

## Technical Notes

**Files to modify**:
- `src/domain/tools/domain/value-objects/tool-type.enum.ts` - Add MCP_TOOL type
- `src/domain/runs/application/use-cases/execute-run/execute-run.use-case.ts` - Add MCP tool routing

**Add ToolType.MCP_TOOL**:
```typescript
// src/domain/tools/domain/value-objects/tool-type.enum.ts
export enum ToolType {
  CODE_EXECUTION = 'code_execution',
  WEBSITE_CONTENT = 'website_content',
  SEND_EMAIL = 'send_email',
  CREATE_CALENDAR_EVENT = 'create_calendar_event',
  INTERNET_SEARCH = 'internet_search',
  SOURCE_QUERY = 'source_query',
  MCP_TOOL = 'mcp_tool', // NEW
}
```

**Modify collectToolResults method**:
```typescript
private async collectToolResults(params: {
  thread: Thread;
  tools: Tool[];
  input: RunToolResultInput | null;
  trace: LangfuseTraceClient;
  orgId: UUID;
}): Promise<ToolResultMessageContent[]> {
  this.logger.debug('collectToolResults');
  const { thread, tools, input, orgId } = params;

  const lastMessage = thread.getLastMessage();
  const toolUseMessageContent = lastMessage
    ? lastMessage.content.filter(
        (content) => content instanceof ToolUseMessageContent,
      )
    : [];

  const toolResultMessageContent: ToolResultMessageContent[] = [];

  for (const content of toolUseMessageContent) {
    const tool = tools.find((tool) => tool.name === content.name);
    if (!tool) {
      toolResultMessageContent.push(
        new ToolResultMessageContent(
          content.id,
          content.name,
          `A tool with the name ${content.name} was not found. Only use tools that are available in your given list of tools.`,
        ),
      );
      continue;
    }

    try {
      // NEW: Check if this is an MCP tool
      if (tool.type === ToolType.MCP_TOOL) {
        // Route to MCP tool execution
        const mcpResult = await this.executeMcpTool(tool, content, params.trace);
        toolResultMessageContent.push(mcpResult);
        continue; // Skip native tool execution logic
      }

      // Existing native tool execution logic
      const capabilities = this.checkToolCapabilitiesUseCase.execute(
        new CheckToolCapabilitiesQuery(tool),
      );

      if (capabilities.isDisplayable) {
        // ... existing displayable tool logic ...
      } else if (capabilities.isExecutable) {
        // ... existing executable tool logic ...
      }
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(`Error processing tool ${content.name}`, error);
      throw new RunToolExecutionFailedError(content.name, {
        error: error as Error,
      });
    }
  }

  return toolResultMessageContent;
}

// NEW: Execute MCP tool
private async executeMcpTool(
  tool: Tool,
  toolUseContent: ToolUseMessageContent,
  trace: LangfuseTraceClient,
): Promise<ToolResultMessageContent> {
  const integrationId = tool.metadata?.integrationId as string;

  if (!integrationId) {
    this.logger.error('MCP tool missing integrationId in metadata', {
      toolName: tool.name,
    });
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      'MCP tool configuration error: missing integration ID',
    );
  }

  this.logger.log('Executing MCP tool', {
    toolName: tool.name,
    integrationId,
  });

  const span = trace.span({
    name: `mcp_tool__${tool.name}`,
    input: toolUseContent.params,
    metadata: {
      toolName: tool.name,
      integrationId,
      toolType: 'mcp',
    },
  });

  try {
    const result = await this.executeMcpToolUseCase.execute(
      new ExecuteMcpToolCommand(
        integrationId,
        tool.name,
        toolUseContent.params,
      ),
    );

    if (result.isError) {
      // Tool execution failed - return error to LLM
      this.logger.warn('MCP tool execution returned error', {
        toolName: tool.name,
        integrationId,
        errorMessage: result.errorMessage,
      });

      span.update({
        metadata: {
          isError: true,
          error: result.errorMessage,
        },
      });
      span.end({
        output: result.errorMessage,
      });

      return new ToolResultMessageContent(
        toolUseContent.id,
        toolUseContent.name,
        `MCP tool execution failed: ${result.errorMessage}`,
      );
    }

    // Tool execution succeeded
    this.logger.log('MCP tool execution succeeded', {
      toolName: tool.name,
      integrationId,
    });

    // Convert result to string (JSON.stringify if object, toString otherwise)
    const resultString = this.convertToolResultToString(result.content);

    span.end({
      output: resultString,
    });

    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      resultString,
    );
  } catch (error) {
    // Unexpected error during execution
    this.logger.error('Unexpected error executing MCP tool', {
      toolName: tool.name,
      integrationId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    span.update({
      metadata: {
        isError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    span.end({
      output: 'Unexpected error',
    });

    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      `MCP tool execution failed unexpectedly: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

// Helper to convert tool result to string
private convertToolResultToString(result: any): string {
  if (typeof result === 'string') {
    return result;
  }
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}
```

**Constructor Injection**:
```typescript
constructor(
  // ... existing dependencies ...
  private readonly executeMcpToolUseCase: ExecuteMcpToolUseCase, // NEW
) {}
```

**Error Handling Pattern**:
- MCP tool execution errors are returned to LLM (not thrown)
- Error transparency: LLM receives error message and can respond intelligently
- Unexpected errors during execution are caught and returned as error messages
- Missing integration ID returns configuration error message
- All errors logged with integration ID and tool name

**Logging Strategy**:
- Log MCP tool execution start with tool name and integration ID
- Log MCP tool execution success with tool name and integration ID
- Log MCP tool execution error with tool name, integration ID, and error message
- Use span tracing for MCP tool executions (same as native tools)

**Testing Approach**:
- Mock `ExecuteMcpToolUseCase`
- Test MCP tool execution success (returns result)
- Test MCP tool execution error (returns error to LLM)
- Test MCP tool alongside native tool (both execute)
- Test MCP tool with missing integration ID (returns error)
- Verify error transparency (errors returned, not thrown)
- Verify logging with correct metadata

**Tool Routing Logic**:
```
LLM calls tool
  ↓
collectToolResults()
  ↓
Tool found in tools array?
  ├─ No → Return "tool not found" error
  └─ Yes → Check tool type
      ├─ ToolType.MCP_TOOL → executeMcpTool() → ExecuteMcpToolUseCase
      └─ Other types → Existing native tool logic
```

**Integration Points**:
- TICKET-028: MCP tools discovered and added to tools array
- TICKET-018: ExecuteMcpToolUseCase handles actual execution
- Coexists with native tools (no breaking changes)
