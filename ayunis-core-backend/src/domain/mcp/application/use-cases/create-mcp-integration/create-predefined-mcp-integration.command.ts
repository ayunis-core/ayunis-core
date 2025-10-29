import { McpAuthMethod } from 'src/domain/mcp/domain/mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/predefined-mcp-integration-slug.enum';

export class CreatePredefinedMcpIntegrationCommand {
  constructor(
    public readonly name: string,
    public readonly slug: PredefinedMcpIntegrationSlug,
    public readonly authMethod?: McpAuthMethod,
    public readonly authHeaderName?: string,
    public readonly encryptedCredentials?: string,
  ) {}
}
