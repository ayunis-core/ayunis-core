import type { Model } from '../../domain/model.entity';
import { ImageGenerationModel } from '../../domain/models/image-generation.model';
import { ModelProvider } from '../../domain/value-objects/model-provider.enum';
import { ImageGenerationModelProviderNotSupportedError } from '../models.errors';

export function assertAzureProviderForImageGenerationModel(
  provider: ModelProvider,
): void {
  if (provider !== ModelProvider.AZURE) {
    throw new ImageGenerationModelProviderNotSupportedError(provider);
  }
}

export function assertSupportedImageGenerationModel(model: Model): void {
  if (model instanceof ImageGenerationModel) {
    assertAzureProviderForImageGenerationModel(model.provider);
  }
}
