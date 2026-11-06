import { Injectable } from '@nestjs/common';
import { McpToolAssemblerService } from 'src/domain/runs/application/services/mcp-tool-assembler.service';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityAssemblyState,
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * Tools and resources of the thread's MCP integrations. Must be the last
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
    const tools = await this.mcpToolAssembler.assemble(
      context.thread,
      state.reservedToolNames,
    );
    return { tools };
  }
}
