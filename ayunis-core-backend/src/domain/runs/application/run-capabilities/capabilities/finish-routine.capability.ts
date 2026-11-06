import { Injectable } from '@nestjs/common';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { RunInvalidInputError } from 'src/domain/runs/application/runs.errors';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/** `finish_routine`, the only way an unattended routine run ends successfully. */
@Injectable()
export class FinishRoutineCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    // Fails before anything is persisted or billed: without tool calls every
    // run would end in nudges and then fail.
    if (!context.model.canUseTools) {
      throw new RunInvalidInputError(
        'Routines need a model that can use tools',
        { model: context.model.name },
      );
    }
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.FINISH_ROUTINE,
    ]);
    return { tools };
  }
}
