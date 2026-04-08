import { Injectable } from '@nestjs/common';
import { McpIntegration } from '../../domain/mcp-integration.entity';
import { McpIntegrationKind } from '../../domain/value-objects/mcp-integration-kind.enum';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../domain/integrations/predefined-mcp-integration.entity';
import { MarketplaceMcpIntegration } from '../../domain/integrations/marketplace-mcp-integration.entity';
import { SelfDefinedMcpIntegration } from '../../domain/integrations/self-defined-mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../domain/value-objects/predefined-mcp-integration-slug.enum';
import { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';
import { McpIntegrationAuth } from '../../domain/auth/mcp-integration-auth.entity';
import { UUID } from 'crypto';

@Injectable()
export class McpIntegrationFactory {
  createIntegration(params: {
    kind: McpIntegrationKind.CUSTOM;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
  }): CustomMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind.PREDEFINED;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    slug: PredefinedMcpIntegrationSlug;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
  }): PredefinedMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind.MARKETPLACE;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    marketplaceIdentifier: string;
    configSchema: IntegrationConfigSchema;
    orgConfigValues: Record<string, string>;
    logoUrl?: string | null;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
  }): MarketplaceMcpIntegration;
  createIntegration(params: {
    kind: McpIntegrationKind.SELF_DEFINED;
    orgId: UUID;
    name: string;
    serverUrl: string;
    auth: McpIntegrationAuth;
    configSchema: IntegrationConfigSchema;
    orgConfigValues: Record<string, string>;
    id?: UUID;
    enabled?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    connectionStatus?: string;
    lastConnectionError?: string;
    lastConnectionCheck?: Date;
    returnsPii?: boolean;
    description?: string;
    oauthClientId?: string;
    oauthClientSecretEncrypted?: string;
  }): SelfDefinedMcpIntegration;
  createIntegration(params: CreateIntegrationParams): McpIntegration {
    const base = this.extractBaseParams(params);

    switch (params.kind) {
      case McpIntegrationKind.PREDEFINED:
        return this.createPredefined(base, params);
      case McpIntegrationKind.MARKETPLACE:
        return this.createMarketplace(base, params);
      case McpIntegrationKind.CUSTOM:
        return new CustomMcpIntegration(base);
      case McpIntegrationKind.SELF_DEFINED:
        return this.createSelfDefined(base, params);
      default: {
        // Exhaustiveness guard: if a new `McpIntegrationKind` is added, this
        // assignment fails to compile and points directly at this switch.
        // It also keeps a runtime safety net for unknown kinds slipping in
        // via `as any`, stale DB rows, or JSON rehydration.
        const _exhaustive: never = params.kind;
        throw new Error(
          `Unknown MCP integration kind: ${_exhaustive as string}`,
        );
      }
    }
  }

  private extractBaseParams(params: CreateIntegrationParams) {
    return {
      id: params.id,
      orgId: params.orgId,
      name: params.name,
      serverUrl: params.serverUrl,
      auth: params.auth,
      enabled: params.enabled,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
      connectionStatus: params.connectionStatus,
      lastConnectionError: params.lastConnectionError,
      lastConnectionCheck: params.lastConnectionCheck,
      returnsPii: params.returnsPii,
      description: params.description,
    } as const;
  }

  private createPredefined(
    base: ReturnType<McpIntegrationFactory['extractBaseParams']>,
    params: CreateIntegrationParams,
  ): PredefinedMcpIntegration {
    if (!params.slug) {
      throw new Error('Predefined integrations require a slug');
    }
    return new PredefinedMcpIntegration({ ...base, slug: params.slug });
  }

  private createMarketplace(
    base: ReturnType<McpIntegrationFactory['extractBaseParams']>,
    params: CreateIntegrationParams,
  ): MarketplaceMcpIntegration {
    if (!params.marketplaceIdentifier) {
      throw new Error('Marketplace integrations require an identifier');
    }
    if (!params.configSchema) {
      throw new Error('Marketplace integrations require a config schema');
    }
    return new MarketplaceMcpIntegration({
      ...base,
      marketplaceIdentifier: params.marketplaceIdentifier,
      configSchema: params.configSchema,
      orgConfigValues: params.orgConfigValues ?? {},
      logoUrl: params.logoUrl,
    });
  }

  private createSelfDefined(
    base: ReturnType<McpIntegrationFactory['extractBaseParams']>,
    params: CreateIntegrationParams,
  ): SelfDefinedMcpIntegration {
    if (!params.configSchema) {
      throw new Error('Self-defined integrations require a config schema');
    }
    return new SelfDefinedMcpIntegration({
      ...base,
      configSchema: params.configSchema,
      orgConfigValues: params.orgConfigValues ?? {},
      oauthClientId: params.oauthClientId,
      oauthClientSecretEncrypted: params.oauthClientSecretEncrypted,
    });
  }
}

type CreateIntegrationParams = {
  kind: McpIntegrationKind;
  orgId: UUID;
  name: string;
  serverUrl: string;
  auth: McpIntegrationAuth;
  slug?: PredefinedMcpIntegrationSlug;
  marketplaceIdentifier?: string;
  configSchema?: IntegrationConfigSchema;
  orgConfigValues?: Record<string, string>;
  logoUrl?: string | null;
  id?: UUID;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  connectionStatus?: string;
  lastConnectionError?: string;
  lastConnectionCheck?: Date;
  returnsPii?: boolean;
  description?: string;
  oauthClientId?: string;
  oauthClientSecretEncrypted?: string;
};
