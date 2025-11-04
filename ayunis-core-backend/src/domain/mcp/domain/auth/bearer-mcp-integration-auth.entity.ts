import { UUID } from 'crypto';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';
import { McpIntegrationAuth } from './mcp-integration-auth.entity';

export class BearerMcpIntegrationAuth extends McpIntegrationAuth {
  public authToken?: string;

  constructor(
    params: {
      id?: UUID;
      authToken?: string;
      createdAt?: Date;
      updatedAt?: Date;
    } = {},
  ) {
    super(params);
    this.authToken = params.authToken;
  }

  getMethod(): McpAuthMethod {
    return McpAuthMethod.BEARER_TOKEN;
  }

  hasCredentials(): boolean {
    return !!this.authToken;
  }

  getAuthHeaderName(): string {
    return 'Authorization';
  }

  setToken(encryptedToken: string): void {
    this.authToken = encryptedToken;
    this.touch();
  }

  clearToken(): void {
    this.authToken = undefined;
    this.touch();
  }
}
