import { NoAuthMcpIntegrationAuth } from './no-auth-mcp-integration-auth.entity';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';

describe('NoAuthMcpIntegrationAuth', () => {
  it('should expose NO_AUTH method', () => {
    const auth = new NoAuthMcpIntegrationAuth();

    expect(auth.getMethod()).toBe(McpAuthMethod.NO_AUTH);
    expect(auth.hasCredentials()).toBe(false);
    expect(auth.getAuthHeaderName()).toBeUndefined();
  });
});
