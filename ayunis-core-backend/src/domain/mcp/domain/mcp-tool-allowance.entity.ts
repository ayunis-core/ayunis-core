import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

/**
 * A user's "always allow" for one MCP tool of one integration: calls to that
 * tool run without asking the user for confirmation. `toolName` is the
 * upstream name the MCP server reports, not the canonical tool name exposed to
 * the model.
 */
export class McpToolAllowance {
  public readonly id: UUID;
  public readonly userId: UUID;
  public readonly integrationId: UUID;
  public readonly toolName: string;
  public readonly createdAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    integrationId: UUID;
    toolName: string;
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.integrationId = params.integrationId;
    this.toolName = params.toolName;
    this.createdAt = params.createdAt ?? new Date();
  }
}
