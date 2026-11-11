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
  CapabilityHookFactory,
  PromptSection,
  RunProfileHandle,
} from 'src/domain/runs/application/run-capabilities/run-capability';
import type { RunCapabilityInput } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import { RunCapabilityContextFactory } from 'src/domain/runs/application/run-capabilities/run-capability-context.factory';
import { composeRunInstructions } from './compose-run-instructions';
import type { RunProfile } from './run-profile';

export interface AssembledRunProfile {
  readonly tools: Tool[];
  /** Names of the tools whose calls wait for the user's confirmation. */
  readonly toolsNeedingApproval: ReadonlySet<string>;
  readonly instructions: string;
  /** The integrations registry is the run's; a refresh replaces its tools. */
  createHooks(integrations: RuntimeToolIntegrationRegistry): Hook[];
}

interface ProfileBuild {
  tools: Tool[];
  toolsNeedingApproval: ReadonlySet<string>;
  instructions: string;
  hooks: CapabilityHookFactory[];
}

/** Builds a run's tools, instructions and profile hooks from its capabilities. */
@Injectable()
export class RunProfileAssembler {
  constructor(
    private readonly contextFactory: RunCapabilityContextFactory,
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly backendToolAdapter: BackendToolAdapter,
    private readonly findMcpToolAllowancesUseCase: FindMcpToolAllowancesUseCase,
  ) {}

  async assemble(
    profile: RunProfile,
    input: RunCapabilityInput,
  ): Promise<AssembledRunProfile> {
    const { tools, toolsNeedingApproval, instructions, hooks } =
      await this.build(profile, input);
    return {
      tools,
      toolsNeedingApproval,
      instructions,
      createHooks: (integrations) => {
        const handle = this.createHandle(profile, input, integrations);
        return hooks.map((createHook) => createHook(handle));
      },
    };
  }

  private createHandle(
    profile: RunProfile,
    input: RunCapabilityInput,
    integrations: RuntimeToolIntegrationRegistry,
  ): RunProfileHandle {
    return {
      refresh: async (target) => {
        const { thread } = await this.findThreadUseCase.execute(
          new FindThreadQuery(input.thread.id),
        );
        const rebuilt = await this.build(profile, { ...input, thread });
        const runtimeTools = this.backendToolAdapter.toRuntimeTools(
          rebuilt.tools,
          rebuilt.toolsNeedingApproval,
        );
        integrations.replaceTools(rebuilt.tools, runtimeTools);
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
    const tools: Tool[] = [];
    const sections: PromptSection[] = [];
    const hooks: CapabilityHookFactory[] = [];
    for (const capability of profile.capabilities) {
      const contribution = await capability.contribute(context, {
        reservedToolNames: new Set(tools.map((tool) => tool.name)),
      });
      tools.push(...(contribution.tools ?? []));
      sections.push(...(contribution.sections ?? []));
      hooks.push(...(contribution.hooks ?? []));
    }
    return {
      tools,
      toolsNeedingApproval: await this.findToolsNeedingApproval(profile, tools),
      instructions: composeRunInstructions(profile, sections, tools),
      hooks,
    };
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
