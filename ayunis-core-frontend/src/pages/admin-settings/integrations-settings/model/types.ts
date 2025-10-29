import type {
  McpIntegrationResponseDto,
  PredefinedConfigResponseDto,
  CreatePredefinedIntegrationDto,
  CreateCustomIntegrationDto,
  UpdateMcpIntegrationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type McpIntegration = McpIntegrationResponseDto;
export type PredefinedConfig = PredefinedConfigResponseDto;

export type CreatePredefinedIntegrationFormData = CreatePredefinedIntegrationDto;
export type CreateCustomIntegrationFormData = CreateCustomIntegrationDto;
export type UpdateIntegrationFormData = UpdateMcpIntegrationDto;

export interface ValidationResult {
  isValid: boolean;
  capabilities?: {
    prompts: number;
    resources: number;
    tools: number;
  };
  error?: string;
}
