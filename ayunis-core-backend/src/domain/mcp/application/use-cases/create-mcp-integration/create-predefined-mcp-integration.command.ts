import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';
import { CredentialFieldValue } from 'src/domain/mcp/domain/predefined-mcp-integration-config';

export class CreatePredefinedMcpIntegrationCommand {
  constructor(
    public readonly slug: PredefinedMcpIntegrationSlug,
    public readonly credentialFields: CredentialFieldValue[],
    public readonly returnsPii?: boolean,
  ) {}
}
