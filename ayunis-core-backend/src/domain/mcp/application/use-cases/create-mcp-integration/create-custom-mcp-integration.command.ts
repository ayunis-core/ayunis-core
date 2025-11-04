import { McpAuthMethod } from 'src/domain/mcp/domain/value-objects/mcp-auth-method.enum';

export class CreateCustomMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly serverUrl: string,
    public readonly authMethod?: McpAuthMethod,
    public readonly authHeaderName?: string,
    public readonly credentials?: string,
  ) {}
}
