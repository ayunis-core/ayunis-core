import {
  hasToolCallNeedingApproval,
  type AssistantMessage,
  type Tool as RuntimeTool,
} from '@ayunis/agent-runtime';
import type { ToolUseIntegration } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';

const NO_CALLS: ReadonlySet<string> = new Set();

/** What the run's current tools tell about the calls the model makes to them. */
export class RuntimeToolIntegrationRegistry {
  private readonly integrations = new Map<string, ToolUseIntegration>();
  private runtimeTools: readonly RuntimeTool[] = [];

  constructor(
    tools: readonly Tool[],
    runtimeTools: readonly RuntimeTool[] = [],
  ) {
    this.replaceTools(tools, runtimeTools);
  }

  /** `runtimeTools` are the runtime's view of `tools`. */
  replaceTools(
    tools: readonly Tool[],
    runtimeTools: readonly RuntimeTool[] = [],
  ): void {
    this.integrations.clear();
    for (const tool of tools) {
      if (
        tool instanceof McpIntegrationTool ||
        tool instanceof McpIntegrationResource
      ) {
        this.integrations.set(tool.name, {
          id: tool.integrationId,
          name: tool.integrationName,
          logoUrl: tool.integrationLogoUrl,
        });
      }
    }
    this.runtimeTools = runtimeTools;
  }

  get(toolName: string): ToolUseIntegration | undefined {
    return this.integrations.get(toolName);
  }

  /**
   * IDs of the turn's calls held for the user's confirmation; none unless the
   * runtime ends the run on this turn to ask for approval.
   */
  callsAwaitingConfirmation(message: AssistantMessage): ReadonlySet<string> {
    if (!hasToolCallNeedingApproval(message, this.runtimeTools)) {
      return NO_CALLS;
    }
    const needingApproval = new Set(
      this.runtimeTools
        .filter((tool) => tool.needsApproval)
        .map((tool) => tool.name),
    );
    return new Set(
      message.content
        .filter((content) => content.type === 'tool_use')
        .filter((call) => needingApproval.has(call.name))
        .map((call) => call.id),
    );
  }
}
