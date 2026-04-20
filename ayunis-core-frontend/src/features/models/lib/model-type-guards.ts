import type {
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
  LanguageModelResponseDto,
} from '@/shared/api';

/**
 * Local discriminated union over the per-type catalog model DTOs.
 *
 * Defined inside `features/models` to avoid coupling cross-page consumers
 * (e.g. regular-admin pages) to the super-admin-specific response type
 * `SuperAdminCatalogModelsControllerGetAllCatalogModels200Item`. Because
 * the super-admin response type is structurally identical to this union
 * (it is itself the union of the three DTOs below), values of the
 * super-admin type still satisfy `CatalogModel`.
 */
export type CatalogModel =
  | LanguageModelResponseDto
  | EmbeddingModelResponseDto
  | ImageGenerationModelResponseDto;

export function isLanguageModel<T extends CatalogModel>(
  model: T,
): model is Extract<T, LanguageModelResponseDto> {
  return model.type === 'language';
}

export function isEmbeddingModel<T extends CatalogModel>(
  model: T,
): model is Extract<T, EmbeddingModelResponseDto> {
  return model.type === 'embedding';
}

export function isImageGenerationModel<T extends CatalogModel>(
  model: T,
): model is Extract<T, ImageGenerationModelResponseDto> {
  return model.type === 'image-generation';
}
