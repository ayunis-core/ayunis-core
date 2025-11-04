import { randomUUID } from 'crypto';
import { CustomMcpIntegration } from './integrations/custom-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from './auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from './auth/bearer-mcp-integration-auth.entity';
import { PredefinedMcpIntegration } from './integrations/predefined-mcp-integration.entity';
import { McpIntegrationKind } from './value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from './value-objects/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from './value-objects/mcp-auth-method.enum';

describe('McpIntegration (Base Class)', () => {
  describe('Common base class behavior', () => {
    it('should generate a UUID when id is not provided', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.id).toBeDefined();
      expect(integration.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should use provided UUID when id is provided', () => {
      const providedId = randomUUID();
      const integration = new CustomMcpIntegration({
        id: providedId,
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.id).toBe(providedId);
    });

    it('should set default values correctly', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      expect(integration.name).toBe('Test Integration');
      expect(integration.orgId).toBe('org-123');
      expect(integration.serverUrl).toBe('http://localhost:3000');
      expect(integration.enabled).toBe(true);
      expect(integration.connectionStatus).toBe('pending');
      expect(integration.createdAt).toBeInstanceOf(Date);
      expect(integration.updatedAt).toBeInstanceOf(Date);
      expect(integration.getAuthType()).toBe(McpAuthMethod.NO_AUTH);
      expect(integration.auth.hasCredentials()).toBe(false);
    });

    it('should disable the integration and update timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: true,
      });

      const beforeDisable = new Date();

      integration.disable();

      expect(integration.enabled).toBe(false);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeDisable.getTime(),
      );
    });

    it('should enable the integration and update timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
        enabled: false,
      });

      const beforeEnable = new Date();

      integration.enable();

      expect(integration.enabled).toBe(true);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeEnable.getTime(),
      );
    });

    it('should update name and timestamp', () => {
      const integration = new CustomMcpIntegration({
        name: 'Old Name',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const beforeUpdate = new Date();

      integration.updateName('New Name');

      expect(integration.name).toBe('New Name');
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should update connection status with error', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const beforeUpdate = new Date();

      integration.updateConnectionStatus('error', 'Connection failed');

      expect(integration.connectionStatus).toBe('error');
      expect(integration.lastConnectionError).toBe('Connection failed');
      expect(integration.lastConnectionCheck).toBeInstanceOf(Date);
      expect(integration.lastConnectionCheck!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should update connection status to connected without error', () => {
      const integration = new CustomMcpIntegration({
        name: 'Test Integration',
        orgId: 'org-123',
        serverUrl: 'http://localhost:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      integration.updateConnectionStatus('connected');

      expect(integration.connectionStatus).toBe('connected');
      expect(integration.lastConnectionError).toBeUndefined();
      expect(integration.lastConnectionCheck).toBeInstanceOf(Date);
    });
  });

  describe('Predefined vs Custom distinction', () => {
    it('should identify predefined integration correctly', () => {
      const auth = new BearerMcpIntegrationAuth();
      const integration = new PredefinedMcpIntegration({
        name: 'Predefined Integration',
        orgId: 'org-123',
        slug: PredefinedMcpIntegrationSlug.TEST,
        serverUrl: 'http://localhost:3000',
        auth,
      });

      expect(integration.kind).toBe(McpIntegrationKind.PREDEFINED);
      expect(integration.isPredefined()).toBe(true);
      expect(integration.isCustom()).toBe(false);
      expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
      expect(integration.getAuthType()).toBe(McpAuthMethod.BEARER_TOKEN);
    });

    it('should identify custom integration correctly', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: 'org-123',
        serverUrl: 'http://custom-server:3000',
        auth: new BearerMcpIntegrationAuth(),
      });

      expect(integration.kind).toBe(McpIntegrationKind.CUSTOM);
      expect(integration.isPredefined()).toBe(false);
      expect(integration.isCustom()).toBe(true);
      expect(integration.serverUrl).toBe('http://custom-server:3000');
    });

    it('allows replacing authentication strategy', () => {
      const integration = new CustomMcpIntegration({
        name: 'Custom Integration',
        orgId: 'org-123',
        serverUrl: 'http://custom-server:3000',
        auth: new NoAuthMcpIntegrationAuth(),
      });

      const bearerAuth = new BearerMcpIntegrationAuth();
      integration.setAuth(bearerAuth);

      expect(integration.auth).toBe(bearerAuth);
      expect(integration.getAuthType()).toBe(McpAuthMethod.BEARER_TOKEN);
    });
  });
});
