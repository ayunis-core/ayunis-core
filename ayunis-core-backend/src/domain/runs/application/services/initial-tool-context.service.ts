import { Injectable } from '@nestjs/common';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { WorkspaceRunContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { ToolAssemblyService } from './tool-assembly.service';

interface InitialToolContextParams {
  thread: Thread;
  activeSkills: Skill[];
  canUseTools: boolean;
  isAnonymous: boolean;
  workspaceContext?: WorkspaceRunContext;
}

@Injectable()
export class InitialToolContextService {
  constructor(private readonly toolAssemblyService: ToolAssemblyService) {}

  async build(params: InitialToolContextParams): Promise<{
    tools: Tool[];
    instructions: string;
    activatedToolNames: Set<string>;
  }> {
    const activatedToolNames = new Set<string>();
    const context = await this.toolAssemblyService.buildRunContext(
      params.thread,
      params.activeSkills,
      params.canUseTools,
      params.isAnonymous,
      params.workspaceContext,
      activatedToolNames,
    );
    return { ...context, activatedToolNames };
  }
}
