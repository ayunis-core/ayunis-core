import { CustomHeaderMcpIntegrationAuth } from './custom-header-mcp-integration-auth.entity';
import { McpAuthMethod } from '../value-objects/mcp-auth-method.enum';

describe('CustomHeaderMcpIntegrationAuth', () => {
  it('should default to X-API-Key header', () => {
    const auth = new CustomHeaderMcpIntegrationAuth();

    expect(auth.getMethod()).toBe(McpAuthMethod.CUSTOM_HEADER);
    expect(auth.getAuthHeaderName()).toBe('X-API-Key');
    expect(auth.hasCredentials()).toBe(false);
  });

  it('should set secret and optional header name', () => {
    const auth = new CustomHeaderMcpIntegrationAuth();
    auth.setSecret('encrypted-secret', 'X-Custom-Header');

    expect(auth.secret).toBe('encrypted-secret');
    expect(auth.getAuthHeaderName()).toBe('X-Custom-Header');
    expect(auth.hasCredentials()).toBe(true);

    auth.clearSecret();
    expect(auth.secret).toBeUndefined();
    expect(auth.hasCredentials()).toBe(false);
  });
});
