import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { appendSkillActivatedNote } from '../../helpers/append-skill-activated-note';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { ToolAssemblyService } from '../../services/tool-assembly.service';
import { BackendToolAdapter } from '../backend-tool.adapter';
import type { RuntimeToolIntegrationRegistry } from '../runtime-tool-integration.registry';

export interface SkillActivationHookParams {
  threadId: UUID;
  activeSkills: Skill[];
  canUseTools: boolean;
  isAnonymous: boolean;
  integrations: RuntimeToolIntegrationRegistry;
  activatedSkillName?: string;
}

/**
 * Builds the skill-activation hook. When the model calls the `activate_skill`
 * signal tool, the tool handler has already copied the skill's sources, MCP
 * integrations and knowledge bases onto the thread and returned its
 * instructions as the tool result. This hook rebuilds the whole tool context
 * from the refreshed thread and swaps it in via `setTools`, so the newly
 * available tools are offered on the next model call — the mid-loop
 * full-replace the runtime's `setTools` escape hatch exists for.
 */
@Injectable()
export class SkillActivationHookFactory {
  constructor(
    private readonly findThreadUseCase: FindThreadUseCase,
    private readonly toolAssemblyService: ToolAssemblyService,
    private readonly backendToolAdapter: BackendToolAdapter,
    private readonly buildWorkspaceRunContextUseCase: BuildWorkspaceRunContextUseCase,
  ) {}

  create(params: SkillActivationHookParams): Hook {
    const activateSkill = ToolType.ACTIVATE_SKILL as string;
    return {
      name: 'ayunis-skill-activation',
      afterToolCall: async (ctx) => {
        if (ctx.isError || ctx.toolCall.name !== activateSkill) {
          return;
        }
        const { thread } = await this.findThreadUseCase.execute(
          new FindThreadQuery(params.threadId),
        );
        const workspaceContext = thread.workspaceId
          ? await this.buildWorkspaceRunContextUseCase.execute(
              new BuildWorkspaceRunContextQuery(thread.workspaceId),
            )
          : undefined;
        const { tools, instructions } =
          await this.toolAssemblyService.buildRunContext(
            thread,
            params.activeSkills,
            params.canUseTools,
            params.isAnonymous,
            workspaceContext,
          );
        params.integrations.replaceTools(tools);
        ctx.setTools(this.backendToolAdapter.toRuntimeTools(tools));
        ctx.setInstructions(
          appendSkillActivatedNote(instructions, params.activatedSkillName),
        );
      },
    };
  }
}
