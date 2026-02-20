import type { UUID } from 'crypto';

/**
 * Interface for resource arguments that define parameters
 * required or optional to access a resource.
 */
export interface ResourceArgument {
  name: string;
  description?: string;
  required: boolean;
}

/**
 * Ephemeral entity representing an MCP resource.
 * These entities are not persisted to the database but are fetched from MCP servers.
 */
export class McpResource {
  public readonly uri: string;
  public readonly name: string;
  public readonly description?: string;
  public readonly mimeType?: string;
  public readonly integrationId: UUID;
  public readonly arguments?: ResourceArgument[];

  constructor(params: {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    integrationId: UUID;
    arguments?: ResourceArgument[];
  }) {
    this.uri = params.uri;
    this.name = params.name;
    this.description = params.description;
    this.mimeType = params.mimeType;
    this.integrationId = params.integrationId;
    this.arguments = params.arguments;
  }
}
