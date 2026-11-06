import { Injectable } from '@nestjs/common';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

@Injectable()
export class CodeExecutionCapability implements RunCapability {
  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    // Match the thread sources prompt's partitioning: PROCESSING/FAILED data
    // sources are announced there as pending/failed, so advertising them here
    // as available would contradict it and steer the model into doomed calls.
    const dataSources = context.threadSources.filter(
      (source) =>
        source.type === SourceType.DATA && source.status === SourceStatus.READY,
    );
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.CODE_EXECUTION],
      dataSources,
    );
    return { tools };
  }
}
