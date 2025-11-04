import { UUID } from 'crypto';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';
import { McpIntegrationAuth } from './mcp-integration-auth.entity';

export class OAuthMcpIntegrationAuth extends McpIntegrationAuth {
  public clientId?: string;
  public clientSecret?: string;
  public accessToken?: string;
  public refreshToken?: string;
  public tokenExpiresAt?: Date;

  constructor(
    params: {
      id?: UUID;
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
    } = {},
  ) {
    super(params);
    this.clientId = params.clientId;
    this.clientSecret = params.clientSecret;
    this.accessToken = params.accessToken;
    this.refreshToken = params.refreshToken;
    this.tokenExpiresAt = params.tokenExpiresAt;
  }

  getMethod(): McpAuthMethod {
    return McpAuthMethod.OAUTH;
  }

  hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthHeaderName(): string {
    return 'Authorization';
  }

  setClientCredentials(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.touch();
  }

  updateTokens(params: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
  }): void {
    this.accessToken = params.accessToken;
    this.refreshToken = params.refreshToken;
    this.tokenExpiresAt = params.tokenExpiresAt;
    this.touch();
  }

  clearTokens(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiresAt = undefined;
    this.touch();
  }

  isTokenExpired(referenceDate: Date = new Date()): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }

    return this.tokenExpiresAt.getTime() <= referenceDate.getTime();
  }
}
