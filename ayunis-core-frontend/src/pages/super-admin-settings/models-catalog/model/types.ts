import type {
  CreateEmbeddingModelRequestDtoDimensions,
  CreateEmbeddingModelRequestDtoProvider,
  CreateLanguageModelRequestDtoProvider,
  CreateLanguageModelRequestDtoTier,
} from '@/shared/api';

export interface ModelPricingFormData {
  inputTokenCost?: number;
  outputTokenCost?: number;
}

export interface LanguageModelFormData extends ModelPricingFormData {
  name: string;
  provider: CreateLanguageModelRequestDtoProvider;
  displayName: string;
  canStream: boolean;
  canUseTools: boolean;
  canVision: boolean;
  isReasoning: boolean;
  isArchived: boolean;
  tier?: CreateLanguageModelRequestDtoTier;
}

export interface EmbeddingModelFormData extends ModelPricingFormData {
  name: string;
  provider: CreateEmbeddingModelRequestDtoProvider;
  displayName: string;
  dimensions: CreateEmbeddingModelRequestDtoDimensions;
  isArchived: boolean;
}
