import type { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import type { AssembleToolUseCase } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.use-case';
import { AssembleToolCommand } from 'src/domain/tools/application/use-cases/assemble-tool/assemble-tool.command';
import type { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { GetPermittedImageGenerationModelQuery } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.query';
import {
  EffectiveImageGenerationModelConflictError,
  PermittedImageGenerationModelNotFoundForOrgError,
} from 'src/domain/models/application/models.errors';

export async function assembleImageGenerationTools(args: {
  orgId: UUID | undefined;
  getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase;
  assembleToolsUseCase: AssembleToolUseCase;
  logger: Logger;
}): Promise<Tool[]> {
  const {
    orgId,
    getPermittedImageGenerationModelUseCase,
    assembleToolsUseCase,
    logger,
  } = args;
  if (!orgId) return [];
  try {
    await getPermittedImageGenerationModelUseCase.execute(
      new GetPermittedImageGenerationModelQuery({ orgId }),
    );
  } catch (error) {
    if (error instanceof PermittedImageGenerationModelNotFoundForOrgError) {
      logger.debug(
        { orgId },
        'No permitted image-generation model; dropping generate_image tool',
      );
      return [];
    }
    if (error instanceof EffectiveImageGenerationModelConflictError) {
      logger.warn(
        { orgId },
        'Conflicting team image-generation grants; dropping generate_image tool',
      );
      return [];
    }
    logger.error(
      {
        orgId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to check image generation model availability',
    );
    throw error;
  }
  return [
    await assembleToolsUseCase.execute(
      new AssembleToolCommand({ type: ToolType.GENERATE_IMAGE }),
    ),
  ];
}
