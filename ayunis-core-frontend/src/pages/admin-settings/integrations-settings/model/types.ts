import type {
  CreateCustomIntegrationDto,
  CreatePredefinedIntegrationDto,
  CreateSelfDefinedIntegrationDto,
  McpIntegrationResponseDto,
  OAuthAuthorizeResponseDto,
  OAuthStatusResponseDto,
  PredefinedConfigResponseDto,
  UpdateMcpIntegrationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface McpIntegrationOAuthInfo {
  enabled: boolean;
  level: 'org' | 'user' | null;
  authorized: boolean;
  hasClientCredentials: boolean;
}

export type McpIntegration = Omit<McpIntegrationResponseDto, 'oauth'> & {
  oauth?: McpIntegrationOAuthInfo;
};
export type PredefinedConfig = PredefinedConfigResponseDto;

export type CreatePredefinedIntegrationFormData =
  CreatePredefinedIntegrationDto;
export type CreateCustomIntegrationFormData = CreateCustomIntegrationDto;
export type CreateSelfDefinedIntegrationPayload =
  CreateSelfDefinedIntegrationDto;
export type UpdateIntegrationFormData = UpdateMcpIntegrationDto;
export type OAuthAuthorizeResponse = OAuthAuthorizeResponseDto;
export type OAuthStatusResponse = OAuthStatusResponseDto;

export interface CreateSelfDefinedIntegrationFormFields {
  name: string;
  description: string;
  serverUrl: string;
  returnsPii: boolean;
  configSchema: string;
  oauthClientId: string;
  oauthClientSecret: string;
}

export interface CreateSelfDefinedIntegrationSchemaError {
  fieldPath?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  capabilities?: {
    prompts: number;
    resources: number;
    tools: number;
  };
  error?: string;
}
