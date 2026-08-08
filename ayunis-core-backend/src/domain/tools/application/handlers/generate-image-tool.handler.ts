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
import { DownloadReferenceImagesUseCase } from 'src/domain/threads/application/use-cases/download-reference-images/download-reference-images.use-case';
import type { ReferenceImageDownload } from 'src/domain/threads/application/use-cases/download-reference-images/download-reference-images.use-case';
import {
  DownloadReferenceImagesQuery,
  UploadedImageRef,
} from 'src/domain/threads/application/use-cases/download-reference-images/download-reference-images.query';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { CheckQuotaUseCase } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.use-case';
import { CheckQuotaQuery } from 'src/iam/quotas/application/use-cases/check-quota/check-quota.query';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import {
  GeneratedImageNotFoundError,
  MessageImageNotFoundError,
  UnsupportedImageContentTypeError,
} from 'src/domain/threads/application/threads.errors';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';

// Provider limit for images.edit; both ref arrays are schema-capped at 16
// individually, so only their combination can exceed it.
const MAX_COMBINED_REFERENCE_IMAGES = 16;

type GenerateImageResult = Awaited<ReturnType<GenerateImageUseCase['execute']>>;
type ValidatedGenerateImageInput = ReturnType<
  GenerateImageTool['validateParams']
>;

@Injectable()
export class GenerateImageToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(GenerateImageToolHandler.name);

  constructor(
    private readonly getPermittedImageGenerationModelUseCase: GetPermittedImageGenerationModelUseCase,
    private readonly generateImageUseCase: GenerateImageUseCase,
    private readonly saveGeneratedImageUseCase: SaveGeneratedImageUseCase,
    private readonly downloadReferenceImagesUseCase: DownloadReferenceImagesUseCase,
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

    // Before the quota check: reference failures are exposed to the model
    // for a corrected retry, which must not find its fair-use slot burned.
    const referenceImages = await this.resolveReferenceImages(
      validatedInput,
      context,
      userId,
      tool.name,
    );

    // After model and reference resolution (their errors trump quota and
    // consume no slot) but before the provider call (a quota miss must not
    // spend tokens).
    await this.checkQuotaUseCase.execute(
      new CheckQuotaQuery(userId, context.orgId, QuotaType.FAIR_USE_IMAGES),
    );

    const result = await this.generateImageUseCase.execute(
      new GenerateImageCommand({
        model: permittedModel.model,
        prompt: validatedInput.prompt,
        size: validatedInput.size,
        referenceImages,
      }),
    );

    return this.persistImageAndCollectUsage({
      permittedModel,
      result,
      context,
      userId,
    });
  }

  private async resolveReferenceImages(
    input: ValidatedGenerateImageInput,
    context: ToolExecutionContext,
    userId: UUID,
    toolName: string,
  ): Promise<ReferenceImageDownload[] | undefined> {
    const uploadedImageRefs = this.parseUploadedImageRefs(
      input.reference_uploaded_image_ids ?? [],
    );
    const generatedImageIds = [
      ...new Set(input.reference_generated_image_ids ?? []),
    ] as UUID[];
    if (uploadedImageRefs.length === 0 && generatedImageIds.length === 0) {
      return undefined;
    }
    if (
      uploadedImageRefs.length + generatedImageIds.length >
      MAX_COMBINED_REFERENCE_IMAGES
    ) {
      throw new ToolExecutionFailedError({
        toolName,
        message: `At most ${MAX_COMBINED_REFERENCE_IMAGES} reference images are allowed per generation across uploaded and generated references. Retry with fewer references.`,
        exposeToLLM: true,
      });
    }
    let images: ReferenceImageDownload[];
    try {
      images = await this.downloadReferenceImagesUseCase.execute(
        new DownloadReferenceImagesQuery({
          threadId: context.threadId,
          userId,
          uploadedImageRefs,
          generatedImageIds,
        }),
      );
    } catch (error) {
      throw this.toReferenceResolutionError(error, toolName);
    }
    // Explicitly requested references must never silently degrade into a
    // text-only generation — surface the reason so the model can react.
    if (images.length === 0) {
      throw new ToolExecutionFailedError({
        toolName,
        message:
          'None of the requested reference images could be used. References must be PNG, JPEG or WebP up to 10 MB each. Retry without references or ask the user for a supported image.',
        exposeToLLM: true,
      });
    }
    return images;
  }

  // The '<uuid>:<index>' shape is guaranteed by the tool schema's pattern.
  private parseUploadedImageRefs(refs: string[]): UploadedImageRef[] {
    return [...new Set(refs)].map((ref) => {
      const [messageId, index] = ref.split(':');
      return { messageId: messageId as UUID, index: Number(index) };
    });
  }

  private toReferenceResolutionError(
    error: unknown,
    toolName: string,
  ): ToolExecutionFailedError {
    if (error instanceof GeneratedImageNotFoundError) {
      return new ToolExecutionFailedError({
        toolName,
        message: `${error.message}. Only image IDs previously returned by this tool in this conversation can be used as references.`,
        exposeToLLM: true,
      });
    }
    if (error instanceof MessageImageNotFoundError) {
      return new ToolExecutionFailedError({
        toolName,
        message: `${error.message}. Only refs from '[image ref: …]' labels in this conversation can be used as uploaded-image references.`,
        exposeToLLM: true,
      });
    }
    if (error instanceof UnsupportedImageContentTypeError) {
      return new ToolExecutionFailedError({
        toolName,
        message: `${error.message}. References must be PNG, JPEG or WebP. Retry without that reference or ask the user for a supported image.`,
        exposeToLLM: true,
      });
    }
    this.logger.error('Failed to load reference images', error);
    return new ToolExecutionFailedError({
      toolName,
      message:
        'The reference images could not be loaded. You may retry without references.',
      exposeToLLM: true,
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
    // ApplicationError messages (quota, content policy, provider outage) are
    // curated for end users — expose them so the model can explain the
    // failure instead of retrying blind into the repeated-failure breaker
    // (AYC-562). A raw rethrow would reach the LLM as "unknown error".
    if (error instanceof ApplicationError) {
      throw new ToolExecutionFailedError({
        toolName,
        message: error.message,
        exposeToLLM: true,
      });
    }
    throw new ToolExecutionFailedError({
      toolName,
      message: 'Image generation failed. Please try again.',
      exposeToLLM: true,
    });
  }
}
