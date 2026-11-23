import {
  MCP_INTEGRATION_WARNING_EVENT,
  type IntegrationWarning,
} from 'src/domain/runs/domain/run-integration-warning';
import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { FindMcpToolAllowancesUseCase } from 'src/domain/mcp/application/use-cases/find-mcp-tool-allowances/find-mcp-tool-allowances.use-case';
import { FindMcpToolAllowancesQuery } from 'src/domain/mcp/application/use-cases/find-mcp-tool-allowances/find-mcp-tool-allowances.query';
import { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import { requiresApproval } from 'src/domain/runs/application/agent-runtime/runtime-tool-policy';
import type {
  CapabilityCatalogEntry,
  CapabilityHookFactory,
  RunProfileHandle,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import type {
  RunCapabilityContext,
  RunCapabilityInput,
} from 'src/domain/runs/application/run-capabilities/run-capability-context';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { ToolLoaderCapability } from 'src/domain/runs/application/run-capabilities/capabilities/tool-loader.capability';
import { CapabilityAssembly } from './capability-assembly';
import { composeRunInstructions } from './compose-run-instructions';
import {
  CapabilityLoading,
  eager,
  type ProfileCapability,
  type RunProfile,
} from './run-profile';

export interface AssembledRunProfile {
  readonly warnings?: readonly IntegrationWarning[];
  readonly tools: Tool[];
  /** Names of the tools whose calls wait for the user's confirmation. */
  readonly toolsNeedingApproval: ReadonlySet<string>;
  readonly instructions: string;
  /** On-demand capabilities this run could load; their tools are not offered. */
  readonly capabilityCatalog: readonly CapabilityCatalogEntry[];
  /** The integrations registry is the run's; a refresh replaces its tools. */
  createHooks(integrations: RuntimeToolIntegrationRegistry): Hook[];
}

interface ProfileBuild {
  warnings: IntegrationWarning[];
  tools: Tool[];
  toolsNeedingApproval: ReadonlySet<string>;
  instructions: string;
  hooks: CapabilityHookFactory[];
  catalog: CapabilityCatalogEntry[];
}

/** Builds a run's tools, instructions and profile hooks from its capabilities. */
@Injectable()
export class RunProfileAssembler {
  constructor(
    private readonly contextFactory: RunCapabilityContextFactory,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly backendToolAdapter: BackendToolAdapter,
    private readonly findMcpToolAllowancesUseCase: FindMcpToolAllowancesUseCase,
    private readonly toolLoader: ToolLoaderCapability,
  ) {}

  async assemble(
    profile: RunProfile,
    input: RunCapabilityInput,
  ): Promise<AssembledRunProfile> {
    const {
      tools,
      toolsNeedingApproval,
      instructions,
      hooks,
      warnings,
      catalog,
    } = await this.build(profile, input);
    return {
      tools,
      warnings,
      toolsNeedingApproval,
      instructions,
      capabilityCatalog: catalog,
      createHooks: (integrations) => {
        const handle = this.createHandle(profile, input, integrations, catalog);
        return hooks.map((createHook) => createHook(handle));
      },
    };
  }

  private createHandle(
    profile: RunProfile,
    input: RunCapabilityInput,
    integrations: RuntimeToolIntegrationRegistry,
    initialCatalog: readonly CapabilityCatalogEntry[],
  ): RunProfileHandle {
    let catalog = initialCatalog;
    return {
      capabilityCatalog: () => catalog,
      refresh: async (target) => {
        const { thread } = await this.findThreadUseCase.execute(
          new FindThreadQuery(input.thread.id),
        );
        const rebuilt = await this.build(profile, { ...input, thread });
        catalog = rebuilt.catalog;
        const runtimeTools = this.backendToolAdapter.toRuntimeTools(
          rebuilt.tools,
          rebuilt.toolsNeedingApproval,
        );
        integrations.replaceTools(rebuilt.tools, runtimeTools);
        for (const warning of rebuilt.warnings)
          target.emit?.({ name: MCP_INTEGRATION_WARNING_EVENT, data: warning });
        target.setTools(runtimeTools);
        target.setInstructions(rebuilt.instructions);
      },
    };
  }

  // Sequential on purpose: each capability sees the tool names taken before
  // it, which lets MCP drop tools that collide with built-ins.
  private async build(
    profile: RunProfile,
    input: RunCapabilityInput,
  ): Promise<ProfileBuild> {
    const context = await this.contextFactory.create(input);
    const assembly = new CapabilityAssembly();
    for (const entry of this.withToolLoader(profile.capabilities)) {
      const contribution = await entry.capability.contribute(
        context,
        assembly.state(),
      );
      if (await isDeferred(entry, context)) {
        assembly.defer(entry.capability, contribution);
      } else {
        assembly.add(contribution);
      }
    }
    const { tools, warnings, sections, hooks, catalog } = assembly;
    return {
      tools,
      warnings,
      toolsNeedingApproval: await this.findToolsNeedingApproval(profile, tools),
      instructions: composeRunInstructions(profile, sections, tools),
      hooks,
      catalog,
    };
  }

  // Last, so the loader sees the catalog of every on-demand capability.
  private withToolLoader(
    capabilities: readonly ProfileCapability[],
  ): readonly ProfileCapability[] {
    const hasOnDemand = capabilities.some(
      ({ loading }) => loading === CapabilityLoading.ON_DEMAND,
    );
    return hasOnDemand
      ? [...capabilities, ...eager(this.toolLoader)]
      : capabilities;
  }

  // Loaded on every build, so tools a refresh adds are checked too.
  private async findToolsNeedingApproval(
    profile: RunProfile,
    tools: readonly Tool[],
  ): Promise<ReadonlySet<string>> {
    const mcpTools = tools.filter(
      (tool): tool is McpIntegrationTool => tool instanceof McpIntegrationTool,
    );
    if (!profile.asksForToolConfirmation || mcpTools.length === 0) {
      return new Set();
    }
    const allowances = await this.findMcpToolAllowancesUseCase.execute(
      new FindMcpToolAllowancesQuery([
        ...new Set(mcpTools.map((tool) => tool.integrationId)),
      ]),
    );
    return new Set(
      mcpTools
        .filter((tool) => requiresApproval(tool, allowances))
        .map((tool) => tool.name),
    );
  }
}

/**
 * An on-demand capability contributes only once the thread loaded it or the
 * context requires it. A model without tools could never load one, so it
 * gets every capability as before.
 */
async function isDeferred(
  { capability, loading }: ProfileCapability,
  context: RunCapabilityContext,
): Promise<boolean> {
  if (loading !== CapabilityLoading.ON_DEMAND) return false;
  if (!context.model.canUseTools) return false;
  if (context.loadedCapabilityIds.has(capability.id)) return false;
  return !(await capability.isRequiredBy?.(context));
}
