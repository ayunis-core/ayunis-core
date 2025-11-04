import { Injectable } from '@nestjs/common';
import { McpIntegrationAuth } from '../../domain/auth/mcp-integration-auth.entity';
import { McpAuthMethod } from '../../domain/value-objects/mcp-auth-method.enum';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../domain/auth/bearer-mcp-integration-auth.entity';
import { CustomHeaderMcpIntegrationAuth } from '../../domain/auth/custom-header-mcp-integration-auth.entity';
import { OAuthMcpIntegrationAuth } from '../../domain/auth/oauth-mcp-integration-auth.entity';
import { UUID } from 'crypto';

@Injectable()
export class McpIntegrationAuthFactory {
  createAuth(params: {
    method: McpAuthMethod.NO_AUTH;
    id?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }): NoAuthMcpIntegrationAuth;
  createAuth(params: {
    method: McpAuthMethod.BEARER_TOKEN;
    authToken: string;
    id?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }): BearerMcpIntegrationAuth;
  createAuth(params: {
    method: McpAuthMethod.CUSTOM_HEADER;
    secret?: string;
    headerName?: string;
    id?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }): CustomHeaderMcpIntegrationAuth;
  createAuth(params: {
    method: McpAuthMethod.OAUTH;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    id?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }): OAuthMcpIntegrationAuth;
  createAuth(params: {
    method: McpAuthMethod;
    authToken?: string;
    secret?: string;
    headerName?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    id?: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }): McpIntegrationAuth {
    const base = {
      id: params.id,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    } as const;

    switch (params.method) {
      case McpAuthMethod.NO_AUTH:
        return new NoAuthMcpIntegrationAuth(base);
      case McpAuthMethod.BEARER_TOKEN: {
        if (!params.authToken) {
          throw new Error('Bearer token auth requires an authToken');
        }
        return new BearerMcpIntegrationAuth({
          ...base,
          authToken: params.authToken,
        });
      }
      case McpAuthMethod.CUSTOM_HEADER:
        return new CustomHeaderMcpIntegrationAuth({
          ...base,
          secret: params.secret,
          headerName: params.headerName,
        });
      case McpAuthMethod.OAUTH:
        return new OAuthMcpIntegrationAuth({
          ...base,
          clientId: params.clientId,
          clientSecret: params.clientSecret,
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
          tokenExpiresAt: params.tokenExpiresAt,
        });
      default:
        throw new Error(`Unknown MCP auth method: ${params.method as string}`);
    }
  }
}
