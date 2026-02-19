import type { PredefinedMcpIntegrationSlug } from './value-objects/predefined-mcp-integration-slug.enum';
import type { McpAuthMethod } from './value-objects/mcp-auth-method.enum';

export enum CredentialFieldType {
  TOKEN = 'token',
  CLIENT_ID = 'clientId',
  CLIENT_SECRET = 'clientSecret',
}

export interface CredentialField {
  label: string;
  type: CredentialFieldType;
  required: boolean;
  help?: string;
}

export interface CredentialFieldValue {
  name: CredentialFieldType;
  value: string;
}

export class PredefinedMcpIntegrationConfig {
  slug: PredefinedMcpIntegrationSlug;
  displayName: string;
  description: string;
  authType: McpAuthMethod;
  authHeaderName?: string;
  credentialFields?: CredentialField[];
  serverUrl: string;

  constructor(params: {
    slug: PredefinedMcpIntegrationSlug;
    displayName: string;
    description: string;
    serverUrl: string;
    authType: McpAuthMethod;
    authHeaderName?: string;
    credentialFields?: CredentialField[];
  }) {
    this.slug = params.slug;
    this.displayName = params.displayName;
    this.description = params.description;
    this.serverUrl = params.serverUrl;
    this.authType = params.authType;
    this.authHeaderName = params.authHeaderName;
    this.credentialFields = params.credentialFields;
  }
}
