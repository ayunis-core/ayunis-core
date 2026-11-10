import { Injectable } from '@nestjs/common';
import { FindManageableRoutinesUseCase } from 'src/domain/routines/application/use-cases/find-manageable-routines/find-manageable-routines.use-case';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * The create/edit routine widgets, offered only to users the routines
 * endpoints would let save them. `edit_routine` lists the user's routines.
 */
@Injectable()
export class RoutinesCapability implements RunCapability {
  constructor(
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly findManageableRoutinesUseCase: FindManageableRoutinesUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const routines = await this.findManageableRoutinesUseCase.execute();
    if (!routines) return {};
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.CREATE_ROUTINE,
    ]);
    if (routines.length > 0) {
      const summaries = new Map(routines.map((r) => [r.id, summarize(r)]));
      tools.push(
        ...(await assembleTools(
          this.assembleToolUseCase,
          [ToolType.EDIT_ROUTINE],
          summaries,
        )),
      );
    }
    return { tools };
  }
}

function summarize(routine: Routine): string {
  const internet = routine.internetEnabled ? 'on' : 'off';
  return `${JSON.stringify(routine.name)} (daily at ${routine.dailyTime}, internet ${internet})`;
}
