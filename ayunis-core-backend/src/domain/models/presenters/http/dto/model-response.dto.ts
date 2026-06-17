import type { LanguageModelResponseDto } from './language-model-response.dto';
import type { EmbeddingModelResponseDto } from './embedding-model-response.dto';
import type { ImageGenerationModelResponseDto } from './image-generation-model-response.dto';

export type ModelResponseDto =
  | LanguageModelResponseDto
  | EmbeddingModelResponseDto
  | ImageGenerationModelResponseDto;
