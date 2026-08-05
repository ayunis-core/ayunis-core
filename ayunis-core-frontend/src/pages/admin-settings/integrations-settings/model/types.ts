import type {
  McpIntegrationResponseDto,
  PredefinedConfigResponseDto,
  CreatePredefinedIntegrationDto,
  UpdateMcpIntegrationDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { McpOAuthClientInput } from '@/shared/lib/mcp-oauth';

export type McpIntegration = McpIntegrationResponseDto;
export type PredefinedConfig = PredefinedConfigResponseDto;

export type CreatePredefinedIntegrationFormData = Omit<
  CreatePredefinedIntegrationDto,
  'slug'
> & {
  slug: CreatePredefinedIntegrationDto['slug'] | '';
};

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
  authType: 'CUSTOM' | 'OAUTH';
  oauthClientRegistration: 'automatic' | 'static';
  oauthScopes: string;
  oauthClientId: string;
  oauthClientSecret: string;
  fields: CustomConfigFieldFormData[];
}

export type UpdateIntegrationFormData = UpdateMcpIntegrationDto & {
  oauthClient?: McpOAuthClientInput;
  oauthClientId?: string;
  oauthClientSecret?: string;
};

export interface ValidationResult {
  isValid: boolean;
  capabilities?: {
    prompts: number;
    resources: number;
    tools: number;
  };
  error?: string;
}
