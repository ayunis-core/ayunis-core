# TICKET-028: Integrate MCP Discovery at Conversation Start

## Description

Integrate MCP capability discovery into the runs module orchestration flow. When a conversation begins (run is created), discover all available MCP tools, resources, and prompts from the agent's assigned MCP integrations and make them available to the LLM for the duration of the run.

**Why**: Agent conversations need access to MCP tools, resources, and prompts. Discovery must happen once at conversation start to ensure all capabilities are available throughout the conversation.

**Technical Approach**:
1. Modify `ExecuteRunUseCase.execute()` to load agent with `mcpIntegrationIds`
2. After loading agent and before orchestrating run, discover MCP capabilities
3. For each MCP integration assigned to agent, call `DiscoverMcpCapabilitiesUseCase`
4. Parallelize discovery calls using `Promise.allSettled()` (not `Promise.all()`)
5. Store discovered capabilities (tools, resources, prompts) in run orchestration context
6. Convert discovered MCP tools to Tool entities and merge with existing tools array
7. Handle discovery failures gracefully (log error, continue without that integration)
8. Pass MCP capabilities to orchestration flow for use in tool execution and resource retrieval

## Acceptance Criteria

- [ ] `ExecuteRunUseCase.execute()` modified to discover MCP capabilities after loading thread
- [ ] Agent loaded from thread includes `mcpIntegrationIds` array
- [ ] `DiscoverMcpCapabilitiesUseCase` injected into `ExecuteRunUseCase`
- [ ] Discovery happens ONCE at conversation start (not per iteration)
- [ ] Discovery parallelized using `Promise.allSettled()` when agent has multiple integrations
- [ ] Discovery failures logged but don't block conversation start
- [ ] Failed integrations logged with integration ID, error type, and error message
- [ ] Discovered MCP tools converted to `Tool` entities using helper method
- [ ] MCP tools merged into existing tools array passed to orchestration
- [ ] MCP tool names prefixed with integration name to avoid collisions (e.g., `slack_send_message`)
- [ ] MCP resources stored in orchestration context for retrieval during run
- [ ] MCP prompts stored in orchestration context for retrieval during run
- [ ] Empty capabilities (no tools/resources/prompts) handled gracefully
- [ ] Logger logs discovery start, success, and failures with integration IDs and counts
- [ ] `RunsModule` imports `McpModule` to access MCP use cases
- [ ] Unit tests added for:
  - Successfully discovers capabilities from single integration
  - Successfully discovers capabilities from multiple integrations (parallel)
  - Continues conversation when one integration fails discovery
  - Continues conversation when all integrations fail discovery
  - Handles agent with no MCP integrations (skips discovery)
  - Handles agent with empty mcpIntegrationIds array (skips discovery)
  - Converts MCP tools to Tool entities correctly
  - Prefixes MCP tool names with integration name
  - Merges MCP tools with native tools without duplicates
  - Logs discovery operations with correct metadata

## Dependencies

- TICKET-017 (Discover MCP Capabilities Use Case)
- TICKET-021 (Agent entity has mcpIntegrationIds property)

## Status

- [x] To Do
- [x] In Progress
- [x] Done

## Complexity

Large

## Technical Notes

**Files to modify**:
- `src/domain/runs/application/use-cases/execute-run/execute-run.use-case.ts` - Add discovery logic
- `src/domain/runs/runs.module.ts` - Import McpModule

**Discovery Flow**:
```typescript
async execute(command: ExecuteRunCommand): Promise<AsyncGenerator<Message, void, void>> {
  // ... existing setup ...

  const thread = await this.findThreadUseCase.execute(
    new FindThreadQuery(command.threadId),
  );
  const model = this.pickModel(thread);

  // NEW: Discover MCP capabilities if agent has integrations
  const mcpCapabilities = await this.discoverMcpCapabilitiesForAgent(thread.agent);

  // Assemble tools (native + MCP)
  const tools = model.model.canUseTools
    ? await this.assembleTools(thread, mcpCapabilities.tools)
    : [];

  const instructions = this.assemblySystemPrompt(thread);

  // ... continue with orchestration ...
  return this.orchestrateRun({
    thread,
    tools,
    model: model.model,
    input: command.input,
    instructions,
    streaming: command.streaming,
    trace,
    orgId,
    mcpResources: mcpCapabilities.resources, // NEW
    mcpPrompts: mcpCapabilities.prompts,     // NEW
  });
}
```

**Discovery Method**:
```typescript
private async discoverMcpCapabilitiesForAgent(
  agent: Agent | null,
): Promise<{
  tools: Tool[];
  resources: McpResource[];
  prompts: McpPrompt[];
}> {
  if (!agent || !agent.mcpIntegrationIds || agent.mcpIntegrationIds.length === 0) {
    this.logger.log('No MCP integrations assigned to agent, skipping discovery');
    return { tools: [], resources: [], prompts: [] };
  }

  this.logger.log('Discovering MCP capabilities', {
    integrationCount: agent.mcpIntegrationIds.length,
    integrationIds: agent.mcpIntegrationIds,
  });

  // Parallelize discovery with Promise.allSettled for graceful failure handling
  const discoveryPromises = agent.mcpIntegrationIds.map((integrationId) =>
    this.discoverMcpCapabilitiesUseCase
      .execute(new DiscoverMcpCapabilitiesQuery(integrationId))
      .catch((error) => {
        this.logger.error('MCP discovery failed for integration', {
          integrationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return null; // Return null for failed discoveries
      }),
  );

  const results = await Promise.allSettled(discoveryPromises);

  // Aggregate capabilities from successful discoveries
  const allTools: McpTool[] = [];
  const allResources: McpResource[] = [];
  const allPrompts: McpPrompt[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value !== null) {
      const integrationId = agent.mcpIntegrationIds[index];
      allTools.push(...result.value.tools);
      allResources.push(...result.value.resources);
      allPrompts.push(...result.value.prompts);

      this.logger.log('MCP discovery succeeded', {
        integrationId,
        toolCount: result.value.tools.length,
        resourceCount: result.value.resources.length,
        promptCount: result.value.prompts.length,
      });
    } else if (result.status === 'rejected') {
      const integrationId = agent.mcpIntegrationIds[index];
      this.logger.error('MCP discovery rejected', {
        integrationId,
        reason: result.reason,
      });
    }
  });

  // Convert MCP tools to Tool entities
  const convertedTools = this.convertMcpToolsToTools(allTools);

  this.logger.log('MCP discovery complete', {
    totalTools: convertedTools.length,
    totalResources: allResources.length,
    totalPrompts: allPrompts.length,
  });

  return {
    tools: convertedTools,
    resources: allResources,
    prompts: allPrompts,
  };
}

private convertMcpToolsToTools(mcpTools: McpTool[]): Tool[] {
  return mcpTools.map((mcpTool) => {
    // Create Tool entity from McpTool
    // Note: MCP tools are NOT saved to DB, they're ephemeral
    return new Tool(
      null, // No ID - ephemeral tool
      mcpTool.name, // Name already prefixed by MCP use case
      mcpTool.description,
      mcpTool.inputSchema,
      ToolType.MCP_TOOL, // New tool type
      false, // Not displayable
      true, // Executable
      null, // No org ID - available to all
      { integrationId: mcpTool.integrationId }, // Store integration ID in metadata
    );
  });
}
```

**Modify assembleTools method**:
```typescript
private async assembleTools(thread: Thread, mcpTools: Tool[]): Promise<Tool[]> {
  const tools: Tool[] = [];

  // Add native agent tools
  if (thread.agent) {
    tools.push(
      ...thread.agent.tools.filter(
        (tool) => tool.type !== ToolType.INTERNET_SEARCH,
      ),
    );
  }

  // Add MCP tools (already converted to Tool entities)
  tools.push(...mcpTools);

  // ... rest of existing tool assembly (code execution, website content, etc.) ...

  return tools;
}
```

**Update RunsModule**:
```typescript
@Module({
  imports: [
    ModelsModule,
    ThreadsModule,
    MessagesModule,
    ToolsModule,
    AgentsModule,
    SubscriptionsModule,
    McpModule, // NEW: Import MCP module
  ],
  controllers: [RunsController],
  providers: [ExecuteRunUseCase, ExecuteRunAndSetTitleUseCase],
  exports: [ExecuteRunUseCase, ExecuteRunAndSetTitleUseCase],
})
export class RunsModule {}
```

**Error Handling Pattern**:
- Discovery failures are logged but don't throw
- Use `Promise.allSettled()` to allow partial success
- Continue conversation even if all MCP integrations fail discovery
- Error transparency: Log integration ID, error type, and message

**Logging Strategy**:
- Log discovery start with integration IDs and count
- Log each successful discovery with capability counts
- Log each failed discovery with integration ID and error
- Log final aggregated counts (total tools/resources/prompts)

**Testing Approach**:
- Mock `DiscoverMcpCapabilitiesUseCase`
- Test parallel discovery with multiple integrations
- Test graceful failure handling (one fails, others succeed)
- Test complete failure (all integrations fail)
- Test agent with no integrations (skip discovery)
- Verify tools array includes both native and MCP tools
- Verify MCP tool conversion logic

**Integration Points**:
- TICKET-029: MCP tools in tools array will be routed to MCP execution
- TICKET-030: MCP resources stored in context for retrieval
- TICKET-031: MCP prompts stored in context for retrieval
