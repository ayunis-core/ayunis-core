import type { UUID } from 'crypto';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';
import { McpIntegrationAuth } from './mcp-integration-auth.entity';

export class CustomHeaderMcpIntegrationAuth extends McpIntegrationAuth {
  public secret?: string;
  public headerName: string;

  constructor(
    params: {
      id?: UUID;
      secret?: string;
      headerName?: string;
      createdAt?: Date;
      updatedAt?: Date;
    } = {},
  ) {
    super(params);
    this.secret = params.secret;
    this.headerName = params.headerName ?? 'X-API-Key';
  }

  getMethod(): McpAuthMethod {
    return McpAuthMethod.CUSTOM_HEADER;
  }

  hasCredentials(): boolean {
    return !!this.secret;
  }

  getAuthHeaderName(): string {
    return this.headerName;
  }

  setSecret(encryptedSecret: string, headerName?: string): void {
    this.secret = encryptedSecret;
    if (headerName) {
      this.headerName = headerName;
    }
    this.touch();
  }

  clearSecret(): void {
    this.secret = undefined;
    this.touch();
  }
}
