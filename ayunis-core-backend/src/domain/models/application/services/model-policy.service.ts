import { Injectable, Logger } from '@nestjs/common';
import type { Model } from 'src/domain/models/domain/model.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import {
  ImageGenerationModelProviderNotSupportedError,
  MultipleEmbeddingModelsNotAllowedError,
  MultipleImageGenerationModelsNotAllowedError,
} from 'src/domain/models/application/models.errors';

export const SUPPORTED_IMAGE_GENERATION_PROVIDERS: ModelProvider[] = [
  ModelProvider.AZURE,
];

@Injectable()
export class ModelPolicyService {
  private readonly logger = new Logger(ModelPolicyService.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  assertSupported(model: Model): void {
    if (model instanceof ImageGenerationModel) {
      this.assertSupportedImageGenerationProvider(model.provider);
    }
  }

  assertSupportedImageGenerationProvider(provider: ModelProvider): void {
    if (!SUPPORTED_IMAGE_GENERATION_PROVIDERS.includes(provider)) {
      this.logger.warn(
        { provider },
        'Unsupported provider for image generation',
      );
      throw new ImageGenerationModelProviderNotSupportedError(provider);
    }
  }

  /**
   * Enforces the single-permitted-model-per-org constraints before a permitted
   * model is created:
   * - Embedding: at most one permitted embedding model per org.
   * - Image-generation: at most one *org-scoped* permitted image model per org.
   *   Team-scoped grants reference the same org model and are de-duplicated per
   *   team+model elsewhere, so they are intentionally exempt.
   */
  async assertSingleModelPerOrg(candidate: PermittedModel): Promise<void> {
    await this.assertSingleEmbedding(candidate);
    await this.assertSingleImageGeneration(candidate);
  }

  private async assertSingleEmbedding(
    candidate: PermittedModel,
  ): Promise<void> {
    if (!(candidate.model instanceof EmbeddingModel)) return;
    const existing = await this.permittedModelsRepository.findOneEmbedding(
      candidate.orgId,
    );
    if (!existing) return;
    const metadata = {
      orgId: candidate.orgId,
      existingPermittedEmbeddingModelId: existing.id,
      newModelId: candidate.model.id,
    };
    this.logger.error(
      metadata,
      'Attempt to create a second permitted embedding model for org',
    );
    throw new MultipleEmbeddingModelsNotAllowedError(metadata);
  }

  private async assertSingleImageGeneration(
    candidate: PermittedModel,
  ): Promise<void> {
    if (
      !(candidate.model instanceof ImageGenerationModel) ||
      candidate.scope !== PermittedModelScope.ORG
    ) {
      return;
    }
    const existing =
      await this.permittedModelsRepository.findOneImageGeneration(
        candidate.orgId,
      );
    if (!existing) return;
    const metadata = {
      orgId: candidate.orgId,
      existingPermittedImageGenerationModelId: existing.id,
      newModelId: candidate.model.id,
    };
    this.logger.error(
      metadata,
      'Attempt to create a second permitted image-generation model for org',
    );
    throw new MultipleImageGenerationModelsNotAllowedError(metadata);
  }
}
