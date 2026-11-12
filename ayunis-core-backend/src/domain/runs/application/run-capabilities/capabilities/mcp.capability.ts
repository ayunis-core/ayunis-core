import { Injectable } from '@nestjs/common';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type CapabilityContribution,
  type RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * Tools and resources of the thread's MCP integrations, plus the instructions
 * the organization wrote for each of them. Must be the last
 * tool-contributing capability of a profile: MCP tools whose names are already
 * taken are dropped, so built-ins always win.
 */
@Injectable()
export class McpCapability implements RunCapability {
  constructor(private readonly mcpToolAssembler: McpToolAssemblerService) {}

  async contribute(
    context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const { tools, integrationInstructions } =
      await this.mcpToolAssembler.assemble(
        context.thread,
        state.reservedToolNames,
      );
    return {
      tools,
      sections: integrationInstructions.map(
        ({ integrationName, instructions }) => {
          const name = escapeXml(integrationName);
          return {
            slot: PromptSlot.RESOURCES,
            content: `<mcp_integration_instructions integration="${name}">\nThe organization's administrators wrote these instructions for working with the MCP integration "${name}". Follow them whenever you use its tools.\n\n${escapeXml(instructions)}\n</mcp_integration_instructions>`,
          };
        },
      ),
    };
  }
}
