import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlag } from 'src/config/features.config';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { RecordingSearchScope } from 'src/domain/tools/domain/tools/recording-search-tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * `recording_search` in every chat. The readable recordings are resolved
 * when it runs and never listed in the prompt, so their number does not grow
 * the prompt.
 */
@Injectable()
export class RecordingsCapability implements RunCapability {
  constructor(
    private readonly assembleToolUseCase: AssembleToolUseCase,
    private readonly configService: ConfigService,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    if (
      !this.configService.get<boolean>(`features.${FeatureFlag.Recordings}`)
    ) {
      return {};
    }
    const tools = await assembleTools(
      this.assembleToolUseCase,
      [ToolType.RECORDING_SEARCH],
      new RecordingSearchScope(context.thread.workspaceId ?? null),
    );
    return { tools };
  }
}
