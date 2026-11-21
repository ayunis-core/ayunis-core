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
  readonly id = 'code_execution';
  readonly description =
    'Run Python code for exact calculations and data analysis, e.g. totals, statistics or evaluations of an uploaded table (berechnen, auswerten, Statistik, CSV/Excel analysieren). Load it when an answer needs computed rather than estimated figures.';

  constructor(private readonly assembleToolUseCase: AssembleToolUseCase) {}

  /** The thread sources prompt lists its ready data sources for code_execution. */
  isRequiredBy(context: RunCapabilityContext): boolean {
    return readyDataSources(context).length > 0;
  }

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.CODE_EXECUTION],
      readyDataSources(context),
    );
    return { tools };
  }
}

// Match the thread sources prompt's partitioning: PROCESSING/FAILED data
// sources are announced there as pending/failed, so advertising them here
// as available would contradict it and steer the model into doomed calls.
function readyDataSources(context: RunCapabilityContext) {
  return context.threadSources.filter(
    (source) =>
      source.type === SourceType.DATA && source.status === SourceStatus.READY,
  );
}
