import { Injectable, Logger } from '@nestjs/common';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from '../ports/execution.handler';
import { GenerateImageTool } from '../../domain/tools/generate-image-tool.entity';
import { ToolExecutionFailedError } from '../tools.errors';
import { GetPermittedImageGenerationModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.use-case';
import { GetPermittedImageGenerationModelQuery } from 'src/domain/models/application/use-cases/get-permitted-image-generation-model/get-permitted-image-generation-model.query';
import { GenerateImageUseCase } from 'src/domain/models/application/use-cases/generate-image/generate-image.use-case';
import { GenerateImageCommand } from 'src/domain/models/application/use-cases/generate-image/generate-image.command';
import { SaveGeneratedImageUseCase } from 'src/domain/threads/application/use-cases/save-generated-image/save-generated-image.use-case';
import { SaveGeneratedImageCommand } from 'src/domain/threads/application/use-cases/save-generated-image/save-generated-image.command';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GenerateImageToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(GenerateImageToolHandler.name);

  constructor(
    private readonly getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase,
    private readonly generateImageUseCase: GenerateImageUseCase,
    private readonly saveGeneratedImageUseCase: SaveGeneratedImageUseCase,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly contextService: ContextService,
  ) {
    super();
  }

  async execute(params: {
    tool: GenerateImageTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing generate_image tool');

    try {
      const validatedInput = tool.validateParams(input);

      const userId = this.contextService.get('userId');
      if (!userId) {
        throw new ToolExecutionFailedError({
          toolName: tool.name,
          message: 'User context is required for image generation',
          exposeToLLM: false,
        });
      }

      const permittedModel =
        await this.getPermittedImageGenerationModelUseCase.execute(
          new GetPermittedImageGenerationModelQuery({
            orgId: context.orgId,
          }),
        );

      const result = await this.generateImageUseCase.execute(
        new GenerateImageCommand({
          model: permittedModel.model,
          prompt: validatedInput.prompt,
        }),
      );

      const { id } = await this.saveGeneratedImageUseCase.execute(
        new SaveGeneratedImageCommand({
          orgId: context.orgId,
          userId,
          threadId: context.threadId,
          imageData: result.imageData,
          contentType: result.contentType,
          isAnonymous: context.isAnonymous ?? false,
        }),
      );

      // Collect usage only after the image is persisted, so a save failure
      // surfaces as a tool-execution failure without recording (and billing)
      // a run that the user never sees. Mirrors execute-run.use-case.ts.
      const usage = result.usage;
      if (
        usage !== undefined &&
        usage.inputTokens !== undefined &&
        usage.outputTokens !== undefined
      ) {
        this.collectUsageAsyncService.collect(
          permittedModel.model,
          usage.inputTokens,
          usage.outputTokens,
        );
      }

      return id;
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error('Failed to execute generate_image tool', error);
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: 'Image generation failed. Please try again.',
        exposeToLLM: true,
      });
    }
  }
}
