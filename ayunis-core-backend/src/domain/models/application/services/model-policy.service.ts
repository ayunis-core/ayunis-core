import { Injectable, Logger } from '@nestjs/common';
import type { Model } from '../../domain/model.entity';
import { ImageGenerationModel } from '../../domain/models/image-generation.model';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ImageGenerationModelProviderNotSupportedError } from '../models.errors';

export const SUPPORTED_IMAGE_GENERATION_PROVIDERS: ModelProvider[] = [
  ModelProvider.AZURE,
];

@Injectable()
export class ModelPolicyService {
  private readonly logger = new Logger(ModelPolicyService.name);

  assertSupported(model: Model): void {
    if (model instanceof ImageGenerationModel) {
      this.assertSupportedImageGenerationProvider(model.provider);
    }
  }

  assertSupportedImageGenerationProvider(provider: ModelProvider): void {
    if (!SUPPORTED_IMAGE_GENERATION_PROVIDERS.includes(provider)) {
      this.logger.warn(
        `Unsupported provider for image generation: ${provider}`,
      );
      throw new ImageGenerationModelProviderNotSupportedError(provider);
    }
  }
}
