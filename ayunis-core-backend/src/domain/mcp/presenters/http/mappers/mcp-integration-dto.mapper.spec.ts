import { McpIntegrationDtoMapper } from './mcp-integration-dto.mapper';
import {
  PredefinedMcpIntegration,
  CustomMcpIntegration,
} from '../../../domain/mcp-integration.entity';
import { PredefinedMcpIntegrationSlug } from '../../../domain/predefined-mcp-integration-slug.enum';
import { McpAuthMethod } from '../../../domain/mcp-auth-method.enum';

describe('McpIntegrationDtoMapper', () => {
  let mapper: McpIntegrationDtoMapper;

  beforeEach(() => {
    mapper = new McpIntegrationDtoMapper();
  });

  describe('toDto', () => {
    describe('predefined integration', () => {
      it('should correctly map predefined integration to DTO', () => {
        const entity = new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'Test Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          authMethod: McpAuthMethod.BEARER_TOKEN,
          authHeaderName: 'Authorization',
          encryptedCredentials: 'encrypted-credentials',
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto).toEqual({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Integration',
          type: 'predefined',
          slug: PredefinedMcpIntegrationSlug.TEST,
          serverUrl: undefined,
          enabled: true,
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          authMethod: McpAuthMethod.BEARER_TOKEN,
          authHeaderName: 'Authorization',
          hasCredentials: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });
      });

      it('should set hasCredentials to false when credentials are null', () => {
        const entity = new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'Test Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto.hasCredentials).toBe(false);
      });

      it('should not expose server URL for predefined integration', () => {
        const entity = new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'Test Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto.serverUrl).toBeUndefined();
        expect(dto.slug).toBe(PredefinedMcpIntegrationSlug.TEST);
      });

      it('should never include actual credentials in DTO', () => {
        const entity = new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'Test Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          authMethod: McpAuthMethod.API_KEY,
          authHeaderName: 'X-API-Key',
          encryptedCredentials: 'super-secret-encrypted-credentials',
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto).not.toHaveProperty('credentials');
        expect(dto).not.toHaveProperty('encryptedCredentials');
        expect(dto.hasCredentials).toBe(true);
      });
    });

    describe('custom integration', () => {
      it('should correctly map custom integration to DTO', () => {
        const entity = new CustomMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'My Custom Server',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          serverUrl: 'https://my-server.com/mcp',
          enabled: false,
          authMethod: McpAuthMethod.API_KEY,
          authHeaderName: 'X-API-Key',
          encryptedCredentials: 'encrypted-api-key',
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto).toEqual({
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'My Custom Server',
          type: 'custom',
          slug: undefined,
          serverUrl: 'https://my-server.com/mcp',
          enabled: false,
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          authMethod: McpAuthMethod.API_KEY,
          authHeaderName: 'X-API-Key',
          hasCredentials: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });
      });

      it('should not expose slug for custom integration', () => {
        const entity = new CustomMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'My Custom Server',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          serverUrl: 'https://my-server.com/mcp',
          enabled: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        });

        const dto = mapper.toDto(entity);

        expect(dto.slug).toBeUndefined();
        expect(dto.serverUrl).toBe('https://my-server.com/mcp');
      });
    });
  });

  describe('toDtoArray', () => {
    it('should map array of integrations correctly', () => {
      const entities = [
        new PredefinedMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174000' as any,
          name: 'Predefined Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          slug: PredefinedMcpIntegrationSlug.TEST,
          enabled: true,
          createdAt: new Date('2025-10-28T10:00:00Z'),
          updatedAt: new Date('2025-10-28T12:00:00Z'),
        }),
        new CustomMcpIntegration({
          id: '123e4567-e89b-12d3-a456-426614174002' as any,
          name: 'Custom Integration',
          organizationId: '123e4567-e89b-12d3-a456-426614174001',
          serverUrl: 'https://custom.com/mcp',
          enabled: false,
          authMethod: McpAuthMethod.BEARER_TOKEN,
          authHeaderName: 'Authorization',
          encryptedCredentials: 'encrypted-token',
          createdAt: new Date('2025-10-28T11:00:00Z'),
          updatedAt: new Date('2025-10-28T13:00:00Z'),
        }),
      ];

      const dtos = mapper.toDtoArray(entities);

      expect(dtos).toHaveLength(2);
      expect(dtos[0].type).toBe('predefined');
      expect(dtos[0].slug).toBe(PredefinedMcpIntegrationSlug.TEST);
      expect(dtos[0].serverUrl).toBeUndefined();
      expect(dtos[1].type).toBe('custom');
      expect(dtos[1].serverUrl).toBe('https://custom.com/mcp');
      expect(dtos[1].slug).toBeUndefined();
    });

    it('should handle empty array', () => {
      const dtos = mapper.toDtoArray([]);
      expect(dtos).toEqual([]);
    });
  });
});
