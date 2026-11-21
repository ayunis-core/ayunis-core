import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { LoadableToolGroups } from 'src/domain/tools/domain/tools/load-tools-tool.entity';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import { escapeXml } from 'src/domain/runs/application/services/xml-escape';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import {
  PromptSlot,
  type CapabilityAssemblyState,
  type CapabilityCatalogEntry,
  type CapabilityContribution,
  type RunCapability,
  type RunProfileHandle,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * Lets the model load the on-demand capabilities of the run's catalog: the
 * `<available_tool_groups>` listing and `load_tools`. The assembler adds it
 * after the capabilities of every profile that has on-demand ones, so it sees
 * the complete catalog; `load_tools` cannot collide with MCP tools, whose
 * names all start with `mcp__`.
 *
 * Its hook exists even while the catalog is empty, because hooks are created
 * only once per run and a refresh can make a capability available.
 */
@Injectable()
export class ToolLoaderCapability implements RunCapability {
  readonly id = 'tool_loader';
  readonly description = 'Loading the tool groups of the capability catalog.';

  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    _context: RunCapabilityContext,
    state: CapabilityAssemblyState,
  ): Promise<CapabilityContribution> {
    const hooks = [createToolLoaderHook];
    const catalog = state.capabilityCatalog;
    if (catalog.length === 0) return { hooks };
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.LOAD_TOOLS],
      new LoadableToolGroups(
        catalog.map(({ id, toolNames }) => ({ id, toolNames })),
      ),
    );
    return {
      tools,
      sections: [{ slot: PromptSlot.TOOL_USAGE, content: render(catalog) }],
      hooks,
    };
  }
}

/**
 * Refreshes the run after a successful `load_tools`, whose handler has stored
 * the groups on the thread, so their tools are offered on the next model
 * call. A call to a tool of an unloaded group gets an error naming the group.
 */
export function createToolLoaderHook(run: RunProfileHandle): Hook {
  const loadTools = ToolType.LOAD_TOOLS as string;
  return {
    name: 'ayunis-tool-loader',
    inheritToChildRuns: false,
    afterToolCall: async (ctx) => {
      if (ctx.isError || ctx.toolCall.name !== loadTools) return;
      await run.refresh(ctx);
    },
    describeUnknownTool: ({ toolCall }) => {
      const group = run
        .capabilityCatalog()
        .find((entry) => entry.toolNames.includes(toolCall.name));
      if (!group) return undefined;
      return `The tool ${toolCall.name} is not available yet: it belongs to the tool group ${group.id}. Call ${loadTools} with {"groups":["${group.id}"]} first, unless a ${loadTools} call in this turn already loads it, then call ${toolCall.name} again in a later turn.`;
    },
  };
}

function render(catalog: readonly CapabilityCatalogEntry[]): string {
  const groups = catalog
    .map(
      (entry) =>
        `  <tool_group>\n    <id>${escapeXml(entry.id)}</id>\n    <description>${escapeXml(entry.description)}</description>\n  </tool_group>`,
    )
    .join('\n');
  return `<available_tool_groups>
These tool groups are not loaded yet. When a task needs one of them, call load_tools with its id first. Its tools become available once load_tools has returned, so call them in a later turn, not next to load_tools. They then stay available for the rest of this chat. Load only the groups the task needs.

${groups}
</available_tool_groups>`;
}
