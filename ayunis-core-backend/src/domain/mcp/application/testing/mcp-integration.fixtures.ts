import { randomUUID } from 'crypto';
import { CustomMcpIntegration } from '../../domain/integrations/custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../domain/auth/no-auth-mcp-integration-auth.entity';

type CustomIntegrationParams = ConstructorParameters<
  typeof CustomMcpIntegration
>[0];

export function aCustomMcpIntegration(
  overrides: Partial<CustomIntegrationParams> = {},
): CustomMcpIntegration {
  return new CustomMcpIntegration({
    orgId: randomUUID(),
    name: 'Custom integration',
    serverUrl: 'https://example.com/mcp',
    auth: new NoAuthMcpIntegrationAuth(),
    configSchema: {
      authType: 'CUSTOM',
      orgFields: [],
      userFields: [],
    },
    orgConfigValues: {},
    ...overrides,
  });
}
