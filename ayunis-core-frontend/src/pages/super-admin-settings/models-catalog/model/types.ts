import type {
  CreateEmbeddingModelRequestDtoDimensions,
  CreateEmbeddingModelRequestDtoProvider,
  CreateLanguageModelRequestDtoProvider,
} from '@/shared/api';

export interface LanguageModelFormData {
  name: string;
  provider: CreateLanguageModelRequestDtoProvider;
  displayName: string;
  canStream: boolean;
  canUseTools: boolean;
  isReasoning: boolean;
  isArchived: boolean;
}

export interface EmbeddingModelFormData {
  name: string;
  provider: CreateEmbeddingModelRequestDtoProvider;
  displayName: string;
  dimensions: CreateEmbeddingModelRequestDtoDimensions;
  isArchived: boolean;
}
