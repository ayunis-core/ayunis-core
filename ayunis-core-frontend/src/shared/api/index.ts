import type {
  AssistantMessageResponseDto,
  EmbeddingModelResponseDto,
  ImageGenerationModelResponseDto,
  LanguageModelResponseDto,
  SystemMessageResponseDto,
  ThreadFavoriteResponseDto,
  ToolResultMessageResponseDto,
  UserMessageResponseDto,
  WorkspaceFavoriteResponseDto,
} from './generated/ayunisCoreAPI.schemas';

// Compatibility aliases for anonymous response types no longer emitted by Orval 8.
export type FavoritesControllerFindAll200Item =
  WorkspaceFavoriteResponseDto | ThreadFavoriteResponseDto;
export type RunMessageResponseDtoMessage =
  | UserMessageResponseDto
  | AssistantMessageResponseDto
  | ToolResultMessageResponseDto
  | SystemMessageResponseDto;
export type SuperAdminCatalogModelsControllerGetAllCatalogModels200Item =
  | LanguageModelResponseDto
  | EmbeddingModelResponseDto
  | ImageGenerationModelResponseDto;

// Re-export all generated API functions and types
export * from './generated/ayunisCoreAPI';
export * from './generated/ayunisCoreAPI.schemas';

// Re-export the axios instance and SSE functions for direct use if needed
export { axiosInstance, customAxiosInstance } from './client';
