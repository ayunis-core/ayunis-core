import { randomUUID } from 'crypto';
import { McpIntegrationMapper } from './mcp-integration.mapper';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../../domain/mcp-integration.entity';
import {
  PredefinedMcpIntegrationRecord,
  CustomMcpIntegrationRecord,
  McpIntegrationRecord,
} from '../schema/mcp-integration.record';
import { McpAuthMethod } from '../../../../domain/mcp-auth-method.enum';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/predefined-mcp-integration-slug.enum';

describe('McpIntegrationMapper', () => {
  describe('toDomain', () => {
    describe('PredefinedMcpIntegration', () => {
      it('should map predefined record to domain entity', () => {
        // Arrange
        const record = new PredefinedMcpIntegrationRecord();
        record.id = randomUUID();
        record.name = 'Test Integration';
        record.organizationId = randomUUID();
        record.slug = PredefinedMcpIntegrationSlug.TEST;
        record.enabled = true;
        record.authMethod = McpAuthMethod.API_KEY;
        record.authHeaderName = 'X-API-Key';
        record.encryptedCredentials = 'encrypted-value';
        record.createdAt = new Date('2024-01-01');
        record.updatedAt = new Date('2024-01-02');

        // Act
        const domain = McpIntegrationMapper.toDomain(record);

        // Assert
        expect(domain).toBeInstanceOf(PredefinedMcpIntegration);
        expect(domain.id).toBe(record.id);
        expect(domain.name).toBe(record.name);
        expect(domain.organizationId).toBe(record.organizationId);
        expect(domain.type).toBe('predefined');
        expect((domain as PredefinedMcpIntegration).slug).toBe(record.slug);
        expect(domain.enabled).toBe(record.enabled);
        expect(domain.authMethod).toBe(record.authMethod);
        expect(domain.authHeaderName).toBe(record.authHeaderName);
        expect(domain.encryptedCredentials).toBe(record.encryptedCredentials);
        expect(domain.createdAt).toEqual(record.createdAt);
        expect(domain.updatedAt).toEqual(record.updatedAt);
      });

      it('should map predefined record with minimal fields', () => {
        // Arrange
        const record = new PredefinedMcpIntegrationRecord();
        record.id = randomUUID();
        record.name = 'Minimal Integration';
        record.organizationId = randomUUID();
        record.slug = PredefinedMcpIntegrationSlug.TEST;
        record.enabled = false;
        record.createdAt = new Date();
        record.updatedAt = new Date();

        // Act
        const domain = McpIntegrationMapper.toDomain(record);

        // Assert
        expect(domain).toBeInstanceOf(PredefinedMcpIntegration);
        expect(domain.authMethod).toBeUndefined();
        expect(domain.authHeaderName).toBeUndefined();
        expect(domain.encryptedCredentials).toBeUndefined();
      });
    });

    describe('CustomMcpIntegration', () => {
      it('should map custom record to domain entity', () => {
        // Arrange
        const record = new CustomMcpIntegrationRecord();
        record.id = randomUUID();
        record.name = 'Custom Integration';
        record.organizationId = randomUUID();
        record.serverUrl = 'http://custom-server.com';
        record.enabled = true;
        record.authMethod = McpAuthMethod.BEARER_TOKEN;
        record.authHeaderName = 'Authorization';
        record.encryptedCredentials = 'encrypted-token';
        record.createdAt = new Date('2024-01-01');
        record.updatedAt = new Date('2024-01-02');

        // Act
        const domain = McpIntegrationMapper.toDomain(record);

        // Assert
        expect(domain).toBeInstanceOf(CustomMcpIntegration);
        expect(domain.id).toBe(record.id);
        expect(domain.name).toBe(record.name);
        expect(domain.organizationId).toBe(record.organizationId);
        expect(domain.type).toBe('custom');
        expect((domain as CustomMcpIntegration).serverUrl).toBe(
          record.serverUrl,
        );
        expect(domain.enabled).toBe(record.enabled);
        expect(domain.authMethod).toBe(record.authMethod);
        expect(domain.authHeaderName).toBe(record.authHeaderName);
        expect(domain.encryptedCredentials).toBe(record.encryptedCredentials);
        expect(domain.createdAt).toEqual(record.createdAt);
        expect(domain.updatedAt).toEqual(record.updatedAt);
      });

      it('should map custom record with minimal fields', () => {
        // Arrange
        const record = new CustomMcpIntegrationRecord();
        record.id = randomUUID();
        record.name = 'Minimal Custom';
        record.organizationId = randomUUID();
        record.serverUrl = 'http://example.com';
        record.enabled = true;
        record.createdAt = new Date();
        record.updatedAt = new Date();

        // Act
        const domain = McpIntegrationMapper.toDomain(record);

        // Assert
        expect(domain).toBeInstanceOf(CustomMcpIntegration);
        expect(domain.authMethod).toBeUndefined();
        expect(domain.authHeaderName).toBeUndefined();
        expect(domain.encryptedCredentials).toBeUndefined();
      });
    });

    it('should throw error for unknown record type', () => {
      // Arrange
      const record = {
        id: randomUUID(),
      } as unknown as McpIntegrationRecord;

      // Act & Assert
      expect(() => McpIntegrationMapper.toDomain(record)).toThrow(
        'Unknown MCP integration record type',
      );
    });
  });

  describe('toRecord', () => {
    describe('PredefinedMcpIntegration', () => {
      it('should map predefined domain entity to record', () => {
        // Arrange
        const domain = new PredefinedMcpIntegration(
          randomUUID(),
          'Test Integration',
          randomUUID(),
          PredefinedMcpIntegrationSlug.TEST,
          true,
          McpAuthMethod.API_KEY,
          'X-API-Key',
          'encrypted-value',
          new Date('2024-01-01'),
          new Date('2024-01-02'),
        );

        // Act
        const record = McpIntegrationMapper.toRecord(domain);

        // Assert
        expect(record).toBeInstanceOf(PredefinedMcpIntegrationRecord);
        expect(record.id).toBe(domain.id);
        expect(record.name).toBe(domain.name);
        expect(record.organizationId).toBe(domain.organizationId);
        expect((record as PredefinedMcpIntegrationRecord).slug).toBe(
          domain.slug,
        );
        expect(record.enabled).toBe(domain.enabled);
        expect(record.authMethod).toBe(domain.authMethod);
        expect(record.authHeaderName).toBe(domain.authHeaderName);
        expect(record.encryptedCredentials).toBe(domain.encryptedCredentials);
        expect(record.createdAt).toEqual(domain.createdAt);
        expect(record.updatedAt).toEqual(domain.updatedAt);
      });

      it('should map predefined domain entity with minimal fields', () => {
        // Arrange
        const domain = new PredefinedMcpIntegration(
          randomUUID(),
          'Minimal Integration',
          randomUUID(),
          PredefinedMcpIntegrationSlug.TEST,
          false,
        );

        // Act
        const record = McpIntegrationMapper.toRecord(domain);

        // Assert
        expect(record).toBeInstanceOf(PredefinedMcpIntegrationRecord);
        expect(record.authMethod).toBeUndefined();
        expect(record.authHeaderName).toBeUndefined();
        expect(record.encryptedCredentials).toBeUndefined();
      });
    });

    describe('CustomMcpIntegration', () => {
      it('should map custom domain entity to record', () => {
        // Arrange
        const domain = new CustomMcpIntegration(
          randomUUID(),
          'Custom Integration',
          randomUUID(),
          'http://custom-server.com',
          true,
          McpAuthMethod.BEARER_TOKEN,
          'Authorization',
          'encrypted-token',
          new Date('2024-01-01'),
          new Date('2024-01-02'),
        );

        // Act
        const record = McpIntegrationMapper.toRecord(domain);

        // Assert
        expect(record).toBeInstanceOf(CustomMcpIntegrationRecord);
        expect(record.id).toBe(domain.id);
        expect(record.name).toBe(domain.name);
        expect(record.organizationId).toBe(domain.organizationId);
        expect((record as CustomMcpIntegrationRecord).serverUrl).toBe(
          domain.serverUrl,
        );
        expect(record.enabled).toBe(domain.enabled);
        expect(record.authMethod).toBe(domain.authMethod);
        expect(record.authHeaderName).toBe(domain.authHeaderName);
        expect(record.encryptedCredentials).toBe(domain.encryptedCredentials);
        expect(record.createdAt).toEqual(domain.createdAt);
        expect(record.updatedAt).toEqual(domain.updatedAt);
      });

      it('should map custom domain entity with minimal fields', () => {
        // Arrange
        const domain = new CustomMcpIntegration(
          randomUUID(),
          'Minimal Custom',
          randomUUID(),
          'http://example.com',
          true,
        );

        // Act
        const record = McpIntegrationMapper.toRecord(domain);

        // Assert
        expect(record).toBeInstanceOf(CustomMcpIntegrationRecord);
        expect(record.authMethod).toBeUndefined();
        expect(record.authHeaderName).toBeUndefined();
        expect(record.encryptedCredentials).toBeUndefined();
      });
    });

    it('should throw error for unknown entity type', () => {
      // Arrange
      const entity = {
        type: 'unknown',
      } as any;

      // Act & Assert
      expect(() => McpIntegrationMapper.toRecord(entity)).toThrow(
        'Unknown MCP integration entity type',
      );
    });
  });
});
