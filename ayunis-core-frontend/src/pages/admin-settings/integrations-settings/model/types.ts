import type {
  McpIntegrationResponseDto,
  PredefinedConfigResponseDto,
  CreatePredefinedIntegrationDto,
  UpdateMcpIntegrationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type McpIntegration = McpIntegrationResponseDto;
export type PredefinedConfig = PredefinedConfigResponseDto;

export type CreatePredefinedIntegrationFormData =
  CreatePredefinedIntegrationDto;

export interface CustomConfigFieldFormData {
  key: string;
  scope: 'organization' | 'user';
  label: string;
  type: 'text' | 'url' | 'secret';
  headerName: string;
  prefix: string;
  required: boolean;
  help: string;
  value: string;
}

export interface CreateCustomIntegrationFormData {
  name: string;
  serverUrl: string;
  fields: CustomConfigFieldFormData[];
}

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
