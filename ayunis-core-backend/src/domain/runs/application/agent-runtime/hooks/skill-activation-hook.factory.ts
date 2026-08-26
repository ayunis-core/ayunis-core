import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { FindThreadQuery } from 'src/domain/threads/application/use-cases/find-thread/find-thread.query';
import { appendSkillActivatedNote } from 'src/domain/runs/application/helpers/append-skill-activated-note';
import { BuildWorkspaceRunContextQuery } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from 'src/domain/workspaces/application/use-cases/build-workspace-run-context/build-workspace-run-context.use-case';
import { ToolAssemblyService } from 'src/domain/runs/application/services/tool-assembly.service';
import { BackendToolAdapter } from 'src/domain/runs/application/agent-runtime/backend-tool.adapter';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import { markToolAsRecentlyActivated } from 'src/domain/runs/application/helpers/mark-tool-as-recently-activated.helper';

export interface SkillActivationHookParams {
  threadId: UUID;
  activeSkills: Skill[];
  canUseTools: boolean;
  isAnonymous: boolean;
  integrations: RuntimeToolIntegrationRegistry;
  activatedSkillName?: string;
  activatedToolNames: Set<string>;
}

/**
 * Skill activation changes thread resources, while load_tools changes the
 * run-scoped tool selection. Both must replace the runtime context before the
 * next model call.
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
    const loadTools = ToolType.LOAD_TOOLS as string;
    return {
      name: 'ayunis-skill-activation',
      afterToolCall: async (ctx) => {
        if (ctx.isError) return;
        const isSkillActivation = ctx.toolCall.name === activateSkill;
        const isToolLoading = ctx.toolCall.name === loadTools;
        if (!isSkillActivation && !isToolLoading) return;
        if (isToolLoading) {
          const toolNames = ctx.toolCall.input.toolNames;
          if (Array.isArray(toolNames)) {
            toolNames
              .filter((name): name is string => typeof name === 'string')
              .forEach((name) =>
                markToolAsRecentlyActivated(params.activatedToolNames, name),
              );
          }
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
            params.activatedToolNames,
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
