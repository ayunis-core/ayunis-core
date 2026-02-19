import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';

export abstract class McpIntegrationAuth {
  public readonly id: UUID;
  public readonly createdAt: Date;
  public updatedAt: Date;

  protected constructor(
    params: { id?: UUID; createdAt?: Date; updatedAt?: Date } = {},
  ) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  abstract getMethod(): McpAuthMethod;

  abstract hasCredentials(): boolean;

  getAuthHeaderName(): string | undefined {
    return undefined;
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }
}
