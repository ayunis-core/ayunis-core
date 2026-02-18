import { LanguageModelResponseDto } from './language-model-response.dto';
import { EmbeddingModelResponseDto } from './embedding-model-response.dto';

export type ModelResponseDto =
  | LanguageModelResponseDto
  | EmbeddingModelResponseDto;
