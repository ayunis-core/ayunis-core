import type { UUID } from 'crypto';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';
import { McpIntegrationAuth } from './mcp-integration-auth.entity';

export class NoAuthMcpIntegrationAuth extends McpIntegrationAuth {
  constructor(params: { id?: UUID; createdAt?: Date; updatedAt?: Date } = {}) {
    super(params);
  }

  getMethod(): McpAuthMethod {
    return McpAuthMethod.NO_AUTH;
  }

  hasCredentials(): boolean {
    return false;
  }
}
