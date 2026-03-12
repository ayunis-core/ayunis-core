import type {
  CreateEmbeddingModelRequestDtoDimensions,
  CreateEmbeddingModelRequestDtoProvider,
  CreateLanguageModelRequestDtoCurrency,
  CreateLanguageModelRequestDtoProvider,
} from '@/shared/api';

export interface ModelPricingFormData {
  inputTokenCost?: number;
  outputTokenCost?: number;
  currency?: CreateLanguageModelRequestDtoCurrency;
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
}

export interface EmbeddingModelFormData extends ModelPricingFormData {
  name: string;
  provider: CreateEmbeddingModelRequestDtoProvider;
  displayName: string;
  dimensions: CreateEmbeddingModelRequestDtoDimensions;
  isArchived: boolean;
}
