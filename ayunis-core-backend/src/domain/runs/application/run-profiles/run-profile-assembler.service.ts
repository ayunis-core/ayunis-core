import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
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
  readonly instructions: string;
  /** The integrations registry is the run's; a refresh replaces its tools. */
  createHooks(integrations: RuntimeToolIntegrationRegistry): Hook[];
}

interface ProfileBuild {
  tools: Tool[];
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
  ) {}

  async assemble(
    profile: RunProfile,
    input: RunCapabilityInput,
  ): Promise<AssembledRunProfile> {
    const { tools, instructions, hooks } = await this.build(profile, input);
    return {
      tools,
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
        integrations.replaceTools(rebuilt.tools);
        target.setTools(this.backendToolAdapter.toRuntimeTools(rebuilt.tools));
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
      instructions: composeRunInstructions(profile, sections, tools),
      hooks,
    };
  }
}
