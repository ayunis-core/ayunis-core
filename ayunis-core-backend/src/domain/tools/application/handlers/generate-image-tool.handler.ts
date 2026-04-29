import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
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
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';

type GenerateImageResult = Awaited<ReturnType<GenerateImageUseCase['execute']>>;

@Injectable()
export class GenerateImageToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(GenerateImageToolHandler.name);

  constructor(
    private readonly getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase,
    private readonly generateImageUseCase: GenerateImageUseCase,
    private readonly saveGeneratedImageUseCase: SaveGeneratedImageUseCase,
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
    private readonly contextService: ContextService,
    private readonly checkQuotaUseCase: CheckQuotaUseCase,
  ) {
    super();
  }

  async execute(params: {
    tool: GenerateImageTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    this.logger.log('Executing generate_image tool');
    try {
      return await this.runGeneration(params);
    } catch (error) {
      this.handleError(error, params.tool.name);
    }
  }

  private async runGeneration(params: {
    tool: GenerateImageTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const validatedInput = tool.validateParams(input);
    const userId = this.requireUserId(tool.name);

    const permittedModel =
      await this.getPermittedImageGenerationModelUseCase.execute(
        new GetPermittedImageGenerationModelQuery({ orgId: context.orgId }),
      );

    // After model resolution (org access errors trump quota) but before the
    // provider call (a quota miss must not spend tokens).
    await this.checkQuotaUseCase.execute(
      new CheckQuotaQuery(userId, QuotaType.FAIR_USE_IMAGES),
    );

    const result = await this.generateImageUseCase.execute(
      new GenerateImageCommand({
        model: permittedModel.model,
        prompt: validatedInput.prompt,
      }),
    );

    return this.persistImageAndCollectUsage({
      permittedModel,
      result,
      context,
      userId,
    });
  }

  private requireUserId(toolName: string): UUID {
    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new ToolExecutionFailedError({
        toolName,
        message: 'User context is required for image generation',
        exposeToLLM: false,
      });
    }
    return userId;
  }

  private async persistImageAndCollectUsage(args: {
    permittedModel: PermittedImageGenerationModel;
    result: GenerateImageResult;
    context: ToolExecutionContext;
    userId: UUID;
  }): Promise<string> {
    const { permittedModel, result, context, userId } = args;
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
    if (usage?.inputTokens !== undefined && usage.outputTokens !== undefined) {
      this.collectUsageAsyncService.collect(
        permittedModel.model,
        usage.inputTokens,
        usage.outputTokens,
      );
    }
    return id;
  }

  private handleError(error: unknown, toolName: string): never {
    if (error instanceof ToolExecutionFailedError) {
      throw error;
    }
    this.logger.error('Failed to execute generate_image tool', error);
    if (error instanceof QuotaExceededError) {
      throw new ToolExecutionFailedError({
        toolName,
        message: error.message,
        exposeToLLM: true,
      });
    }
    if (error instanceof ApplicationError) {
      throw error;
    }
    throw new ToolExecutionFailedError({
      toolName,
      message: 'Image generation failed. Please try again.',
      exposeToLLM: true,
    });
  }
}
