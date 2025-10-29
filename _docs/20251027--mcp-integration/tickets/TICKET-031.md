# TICKET-031: Integrate MCP Prompt Retrieval in Runs

## Description

Add MCP prompt retrieval capability to the runs module orchestration flow. MCP prompts are predefined prompt templates from MCP servers that can be retrieved programmatically by agents. When the LLM requests a prompt (via special tool call), retrieve it from the MCP server and return the prompt messages and description. Prompts are available programmatically to agents, not displayed in the UI.

**Why**: Agent conversations need to access predefined prompt templates from MCP servers for structured interactions and guidance. MCP prompts provide reusable, server-managed conversational patterns.

**Technical Approach**:
1. Add a special "retrieve_mcp_prompt" native tool to the tools array
2. When LLM calls this tool, extract prompt name, integration ID, and arguments from parameters
3. Call `GetMcpPromptUseCase` with integration ID, prompt name, and arguments
4. Return prompt result (messages and description) to LLM as formatted string
5. Handle errors gracefully (return error message to LLM)
6. Log all prompt retrievals with integration ID and prompt name

## Acceptance Criteria

- [ ] New native tool "retrieve_mcp_prompt" added to tools assembly in `ExecuteRunUseCase`
- [ ] Tool schema includes: `promptName` (string, required), `integrationId` (string, required), `arguments` (object, optional)
- [ ] Tool description explains prompt retrieval and usage
- [ ] Tool is always available when agent has MCP integrations
- [ ] `GetMcpPromptUseCase` injected into `ExecuteRunUseCase`
- [ ] Tool execution routes to new `executeMcpPromptRetrieval()` method
- [ ] `executeMcpPromptRetrieval()` calls `GetMcpPromptUseCase`
- [ ] Prompt result formatted as string for tool result: includes messages and description
- [ ] Prompt messages formatted with role labels (e.g., "User: message text\nAssistant: response text")
- [ ] Prompt retrieval errors returned to LLM (not thrown)
- [ ] Error message format: "Prompt retrieval failed: {errorMessage}"
- [ ] Prompt arguments supported (passed to use case)
- [ ] Prompt retrieval logged with integration ID, prompt name, and result status
- [ ] Tool result includes prompt name and formatted content
- [ ] Unit tests added for:
  - Successfully retrieves prompt with arguments and returns formatted result
  - Successfully retrieves prompt without arguments
  - Returns error to LLM when prompt retrieval fails
  - Returns error when integration ID missing from parameters
  - Returns error when prompt name missing from parameters
  - Formats prompt messages correctly with role labels
  - Logs prompt retrievals with correct metadata
  - Tool parameters validated (promptName and integrationId required)

## Dependencies

- TICKET-020 (Get MCP Prompt Use Case)
- TICKET-028 (MCP capabilities available in orchestration context)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Medium

## Technical Notes

**Files to modify**:
- `src/domain/runs/application/use-cases/execute-run/execute-run.use-case.ts` - Add prompt retrieval tool and logic
- `src/domain/tools/domain/value-objects/tool-type.enum.ts` - Add MCP_PROMPT type

**Add ToolType.MCP_PROMPT**:
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
  MCP_RESOURCE = 'mcp_resource',
  MCP_PROMPT = 'mcp_prompt', // NEW
}
```

**Add Prompt Retrieval Tool**:
```typescript
private async assembleTools(thread: Thread, mcpTools: Tool[]): Promise<Tool[]> {
  const tools: Tool[] = [];

  // ... existing tool assembly logic ...

  // NEW: Add MCP prompt retrieval tool if agent has MCP integrations
  if (thread.agent && thread.agent.mcpIntegrationIds?.length > 0) {
    tools.push(this.createMcpPromptRetrievalTool());
  }

  return tools;
}

// NEW: Create MCP prompt retrieval tool
private createMcpPromptRetrievalTool(): Tool {
  return new Tool(
    null, // No ID - ephemeral tool
    'retrieve_mcp_prompt',
    'Retrieve a prompt template from an MCP integration. Prompts are predefined conversational templates that provide structured guidance for specific tasks. Use this when you need reusable prompt patterns from MCP servers.',
    {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'The ID of the MCP integration to retrieve the prompt from',
        },
        promptName: {
          type: 'string',
          description: 'The name of the prompt template to retrieve',
        },
        arguments: {
          type: 'object',
          description: 'Optional arguments for prompt template substitution',
          additionalProperties: true,
        },
      },
      required: ['integrationId', 'promptName'],
    },
    ToolType.MCP_PROMPT, // NEW tool type
    false, // Not displayable
    true, // Executable
    null, // No org ID
    {}, // No metadata
  );
}
```

**Modify collectToolResults for prompt retrieval**:
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
      // NEW: Check if this is MCP prompt retrieval
      if (tool.type === ToolType.MCP_PROMPT) {
        const promptResult = await this.executeMcpPromptRetrieval(
          content,
          params.trace,
        );
        toolResultMessageContent.push(promptResult);
        continue; // Skip other tool execution logic
      }

      // Existing MCP resource check
      if (tool.type === ToolType.MCP_RESOURCE) {
        // ... existing MCP resource logic ...
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

// NEW: Execute MCP prompt retrieval
private async executeMcpPromptRetrieval(
  toolUseContent: ToolUseMessageContent,
  trace: LangfuseTraceClient,
): Promise<ToolResultMessageContent> {
  const integrationId = toolUseContent.params.integrationId as string;
  const promptName = toolUseContent.params.promptName as string;
  const promptArguments = toolUseContent.params.arguments as
    | Record<string, string>
    | undefined;

  if (!integrationId) {
    this.logger.error('MCP prompt retrieval missing integrationId');
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      'Prompt retrieval failed: integrationId parameter is required',
    );
  }

  if (!promptName) {
    this.logger.error('MCP prompt retrieval missing promptName');
    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      'Prompt retrieval failed: promptName parameter is required',
    );
  }

  this.logger.log('Retrieving MCP prompt', {
    integrationId,
    promptName,
    hasArguments: !!promptArguments,
  });

  const span = trace.span({
    name: 'mcp_prompt_retrieval',
    input: { integrationId, promptName, arguments: promptArguments },
    metadata: {
      integrationId,
      promptName,
      operationType: 'prompt_retrieval',
    },
  });

  try {
    const promptResult = await this.getMcpPromptUseCase.execute(
      new GetMcpPromptQuery(integrationId, promptName, promptArguments),
    );

    this.logger.log('MCP prompt retrieval succeeded', {
      integrationId,
      promptName,
      messageCount: promptResult.messages.length,
    });

    // Format prompt result as string for tool result
    const formattedPrompt = this.formatPromptResult(promptResult, promptName);

    span.end({
      output: formattedPrompt,
    });

    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      formattedPrompt,
    );
  } catch (error) {
    this.logger.error('MCP prompt retrieval failed', {
      integrationId,
      promptName,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    span.update({
      metadata: {
        isError: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    span.end({
      output: 'Prompt retrieval failed',
    });

    return new ToolResultMessageContent(
      toolUseContent.id,
      toolUseContent.name,
      `Prompt retrieval failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}

// Helper to format prompt result
private formatPromptResult(
  promptResult: PromptResult,
  promptName: string,
): string {
  let formatted = `Prompt: ${promptName}\n`;

  if (promptResult.description) {
    formatted += `Description: ${promptResult.description}\n`;
  }

  formatted += '\nMessages:\n';
  promptResult.messages.forEach((message, index) => {
    const roleLabel =
      message.role.charAt(0).toUpperCase() + message.role.slice(1);
    formatted += `${index + 1}. ${roleLabel}: ${message.content}\n`;
  });

  return formatted;
}
```

**Constructor Injection**:
```typescript
constructor(
  // ... existing dependencies ...
  private readonly executeMcpToolUseCase: ExecuteMcpToolUseCase,
  private readonly retrieveMcpResourceUseCase: RetrieveMcpResourceUseCase,
  private readonly getMcpPromptUseCase: GetMcpPromptUseCase, // NEW
) {}
```

**Prompt Retrieval Flow**:
```
LLM needs MCP prompt template
  ↓
LLM calls "retrieve_mcp_prompt" tool
  ↓
collectToolResults() detects ToolType.MCP_PROMPT
  ↓
executeMcpPromptRetrieval() extracts parameters
  ↓
GetMcpPromptUseCase.execute()
  ↓
Format prompt result as string (messages + description)
  ↓
Return formatted prompt to LLM
  ↓
LLM can use prompt template for guidance
```

**Prompt Formatting Example**:
```
Prompt: customer_support_greeting
Description: A friendly greeting template for customer support interactions

Messages:
1. System: You are a helpful customer support agent. Always be polite and professional.
2. User: {customer_query}
3. Assistant: Thank you for contacting us! I'll be happy to help you with {topic}.
```

**Error Handling Pattern**:
- Missing required parameters return error message to LLM
- Prompt retrieval errors caught and returned to LLM (not thrown)
- Error transparency: LLM receives error message and can respond intelligently
- All errors logged with integration ID, prompt name, and error message

**Logging Strategy**:
- Log prompt retrieval start with integration ID and prompt name
- Log successful retrieval with integration ID, prompt name, and message count
- Log failed retrieval with integration ID, prompt name, and error
- Use span tracing for prompt retrievals

**Testing Approach**:
- Mock `GetMcpPromptUseCase`
- Test prompt retrieval with arguments
- Test prompt retrieval without arguments
- Test missing required parameters (returns error)
- Test prompt retrieval error (returns error to LLM)
- Test prompt formatting (role labels, description)
- Verify tool is only added when agent has MCP integrations
- Verify logging with correct metadata

**Key Differences from Resources**:
- Prompts return content directly (not imported as sources)
- Prompts are formatted with role labels for readability
- Prompts are primarily for LLM guidance (not data access)
- Prompts support template arguments for customization

**Integration Points**:
- TICKET-020: GetMcpPromptUseCase handles actual retrieval
- TICKET-028: Agent's mcpIntegrationIds determine tool availability
- Simpler than resource retrieval (no side effects, just return formatted content)
