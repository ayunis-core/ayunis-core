import { BearerMcpIntegrationAuth } from './bearer-mcp-integration-auth.entity';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';

describe('BearerMcpIntegrationAuth', () => {
  it('should default to Authorization header', () => {
    const auth = new BearerMcpIntegrationAuth();

    expect(auth.getMethod()).toBe(McpAuthMethod.BEARER_TOKEN);
    expect(auth.getAuthHeaderName()).toBe('Authorization');
    expect(auth.hasCredentials()).toBe(false);
  });

  it('should set and clear token', () => {
    const auth = new BearerMcpIntegrationAuth();
    const beforeUpdate = auth.updatedAt;

    auth.setToken('encrypted');

    expect(auth.authToken).toBe('encrypted');
    expect(auth.hasCredentials()).toBe(true);
    expect(auth.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeUpdate.getTime(),
    );

    auth.clearToken();

    expect(auth.authToken).toBeUndefined();
    expect(auth.hasCredentials()).toBe(false);
  });
});
