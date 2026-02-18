import { UUID } from 'crypto';

/**
 * Interface for prompt arguments that define parameters
 * required or optional to use a prompt.
 */
export interface PromptArgument {
  name: string;
  required: boolean;
}

/**
 * Ephemeral entity representing an MCP prompt.
 * These entities are not persisted to the database but are fetched from MCP servers.
 */
export class McpPrompt {
  public readonly name: string;
  public readonly description?: string;
  public readonly arguments: PromptArgument[];
  public readonly integrationId: UUID;

  constructor(
    name: string,
    description: string | undefined,
    args: PromptArgument[],
    integrationId: UUID,
  ) {
    this.name = name;
    this.description = description;
    this.arguments = args;
    this.integrationId = integrationId;
  }
}
