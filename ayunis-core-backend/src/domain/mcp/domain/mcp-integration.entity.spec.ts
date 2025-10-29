import { randomUUID } from 'crypto';
import {
  McpIntegration,
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from './mcp-integration.entity';
import { McpAuthMethod } from './mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from './predefined-mcp-integration-slug.enum';

describe('McpIntegration', () => {
  describe('Base class', () => {
    // We'll use PredefinedMcpIntegration for testing the abstract base class functionality

    it('should generate a UUID when id is null', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.id).toBeDefined();
      expect(integration.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should use provided UUID when id is not null', () => {
      const providedId = randomUUID();
      const integration = new PredefinedMcpIntegration(
        providedId,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.id).toBe(providedId);
    });

    it('should set default values correctly', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.name).toBe('Test Integration');
      expect(integration.organizationId).toBe('org-123');
      expect(integration.enabled).toBe(true);
      expect(integration.authMethod).toBeUndefined();
      expect(integration.authHeaderName).toBeUndefined();
      expect(integration.encryptedCredentials).toBeUndefined();
      expect(integration.createdAt).toBeInstanceOf(Date);
      expect(integration.updatedAt).toBeInstanceOf(Date);
    });

    it('should set authentication fields when provided', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'encrypted-credentials',
      );

      expect(integration.authMethod).toBe(McpAuthMethod.API_KEY);
      expect(integration.authHeaderName).toBe('X-API-Key');
      expect(integration.encryptedCredentials).toBe('encrypted-credentials');
    });

    it('should disable the integration and update timestamp', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        true,
      );

      const beforeDisable = new Date();

      integration.disable();

      expect(integration.enabled).toBe(false);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeDisable.getTime(),
      );
    });

    it('should enable the integration and update timestamp', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        false,
      );

      const beforeEnable = new Date();

      integration.enable();

      expect(integration.enabled).toBe(true);
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeEnable.getTime(),
      );
    });

    it('should update credentials and timestamp', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'old-credentials',
      );

      const beforeUpdate = new Date();

      integration.updateCredentials('new-encrypted-credentials');

      expect(integration.encryptedCredentials).toBe(
        'new-encrypted-credentials',
      );
      expect(integration.updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    it('should return true for hasAuthentication when authMethod is set', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'encrypted-token',
      );

      expect(integration.hasAuthentication()).toBe(true);
    });

    it('should return false for hasAuthentication when authMethod is not set', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Integration',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.hasAuthentication()).toBe(false);
    });
  });

  describe('PredefinedMcpIntegration', () => {
    it('should have correct type discriminator', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Predefined',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.type).toBe('predefined');
    });

    it('should set slug correctly', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Predefined',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
      );

      expect(integration.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
    });

    it('should support authentication fields', () => {
      const integration = new PredefinedMcpIntegration(
        null,
        'Test Predefined',
        'org-123',
        PredefinedMcpIntegrationSlug.TEST,
        true,
        McpAuthMethod.API_KEY,
        'X-API-Key',
        'encrypted-key',
      );

      expect(integration.hasAuthentication()).toBe(true);
      expect(integration.authMethod).toBe(McpAuthMethod.API_KEY);
      expect(integration.authHeaderName).toBe('X-API-Key');
      expect(integration.encryptedCredentials).toBe('encrypted-key');
    });
  });

  describe('CustomMcpIntegration', () => {
    it('should have correct type discriminator', () => {
      const integration = new CustomMcpIntegration(
        null,
        'Test Custom',
        'org-123',
        'http://localhost:3000',
      );

      expect(integration.type).toBe('custom');
    });

    it('should set serverUrl correctly', () => {
      const integration = new CustomMcpIntegration(
        null,
        'Test Custom',
        'org-123',
        'http://localhost:3000',
      );

      expect(integration.serverUrl).toBe('http://localhost:3000');
    });

    it('should support authentication fields', () => {
      const integration = new CustomMcpIntegration(
        null,
        'Test Custom',
        'org-123',
        'http://localhost:3000',
        true,
        McpAuthMethod.BEARER_TOKEN,
        'Authorization',
        'encrypted-token',
      );

      expect(integration.hasAuthentication()).toBe(true);
      expect(integration.authMethod).toBe(McpAuthMethod.BEARER_TOKEN);
      expect(integration.authHeaderName).toBe('Authorization');
      expect(integration.encryptedCredentials).toBe('encrypted-token');
    });
  });
});
