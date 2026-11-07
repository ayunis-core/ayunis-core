import { Injectable, Logger } from '@nestjs/common';
import {
  EffectiveImageGenerationModelConflictError,
  PermittedImageGenerationModelNotFoundForOrgError,
} from 'src/domain/models/application/models.errors';
import { GetPermittedImageGenerationModelQuery } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.query';
import { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { assembleTools } from 'src/domain/runs/application/run-capabilities/assemble-tools.helper';
import type { RunCapabilityContext } from 'src/domain/runs/application/run-capabilities/run-capability-context';
import type {
  CapabilityContribution,
  RunCapability,
} from 'src/domain/runs/application/run-capabilities/run-capability';

/**
 * `generate_image`, offered only when an image-generation model is effectively
 * available to the current user (team-override aware).
 */
@Injectable()
export class ImageGenerationCapability implements RunCapability {
  private readonly logger = new Logger(ImageGenerationCapability.name);

  constructor(
    private readonly getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase,
    private readonly assembleToolUseCase: AssembleToolUseCase,
  ) {}

  async contribute(
    context: RunCapabilityContext,
  ): Promise<CapabilityContribution> {
    if (!context.model.canUseTools) return {};
    if (!(await this.hasPermittedModel(context))) return {};
    const tools = await assembleTools(this.assembleToolUseCase, [
      ToolType.GENERATE_IMAGE,
    ]);
    return { tools };
  }

  private async hasPermittedModel(
    context: RunCapabilityContext,
  ): Promise<boolean> {
    const { orgId } = context;
    try {
      await this.getPermittedImageGenerationModelUseCase.execute(
        new GetPermittedImageGenerationModelQuery({ orgId }),
      );
      return true;
    } catch (error) {
      if (error instanceof PermittedImageGenerationModelNotFoundForOrgError) {
        this.logger.debug(
          { orgId },
          'No permitted image-generation model; dropping generate_image tool',
        );
        return false;
      }
      if (error instanceof EffectiveImageGenerationModelConflictError) {
        this.logger.warn(
          { orgId },
          'Conflicting team image-generation grants; dropping generate_image tool',
        );
        return false;
      }
      this.logger.error(
        {
          orgId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to check image generation model availability',
      );
      throw error;
    }
  }
}
