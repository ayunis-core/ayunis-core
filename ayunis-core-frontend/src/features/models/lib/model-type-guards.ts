import type {
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
  LanguageModelResponseDto,
  SuperAdminCatalogModelsControllerGetAllCatalogModels200Item,
} from '@/shared/api';

type CatalogModelUnion =
  SuperAdminCatalogModelsControllerGetAllCatalogModels200Item;

export function isLanguageModel(
  model: CatalogModelUnion,
): model is LanguageModelResponseDto {
  return model.type === 'language';
}

export function isEmbeddingModel(
  model: CatalogModelUnion,
): model is EmbeddingModelResponseDto {
  return model.type === 'embedding';
}

export function isImageGenerationModel(
  model: CatalogModelUnion,
): model is ImageGenerationModelResponseDto {
  return model.type === 'image-generation';
}
