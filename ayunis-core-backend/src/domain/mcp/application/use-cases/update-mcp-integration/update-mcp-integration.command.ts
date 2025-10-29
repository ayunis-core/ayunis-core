import { McpAuthMethod } from 'src/domain/mcp/domain/mcp-auth-method.enum';

export class UpdateMcpIntegrationCommand {
  constructor(
    public readonly integrationId: string,
    public readonly name?: string,
    public readonly authMethod?: McpAuthMethod,
    public readonly authHeaderName?: string,
    public readonly encryptedCredentials?: string,
  ) {}
}
