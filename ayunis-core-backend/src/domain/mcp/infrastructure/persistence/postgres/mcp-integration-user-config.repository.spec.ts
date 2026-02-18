import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { McpIntegrationUserConfigRepository } from './mcp-integration-user-config.repository';
import { McpIntegrationUserConfigRecord } from './schema/mcp-integration-user-config.record';
import { McpIntegrationUserConfig } from '../../../domain/mcp-integration-user-config.entity';

describe('McpIntegrationUserConfigRepository', () => {
  let repository: McpIntegrationUserConfigRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<McpIntegrationUserConfigRecord>>;

  const integrationId = randomUUID();
  const userId = randomUUID();
  const configId = randomUUID();
  const now = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    mockTypeOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<McpIntegrationUserConfigRecord>>;

    repository = new McpIntegrationUserConfigRepository(mockTypeOrmRepo);
  });

  describe('save', () => {
    it('should persist user config and return domain entity', async () => {
      const config = new McpIntegrationUserConfig({
        id: configId,
        integrationId,
        userId,
        configValues: { personalToken: 'encrypted-user-token' },
        createdAt: now,
        updatedAt: now,
      });

      const savedRecord = new McpIntegrationUserConfigRecord();
      savedRecord.id = configId;
      savedRecord.integrationId = integrationId;
      savedRecord.userId = userId;
      savedRecord.configValues = { personalToken: 'encrypted-user-token' };
      savedRecord.createdAt = now;
      savedRecord.updatedAt = now;

      mockTypeOrmRepo.save.mockResolvedValue(savedRecord);

      const result = await repository.save(config);

      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: configId,
          integrationId,
          userId,
          configValues: { personalToken: 'encrypted-user-token' },
        }),
      );
      expect(result).toBeInstanceOf(McpIntegrationUserConfig);
      expect(result.id).toBe(configId);
      expect(result.configValues).toEqual({
        personalToken: 'encrypted-user-token',
      });
    });
  });

  describe('findByIntegrationAndUser', () => {
    it('should return domain entity when config exists', async () => {
      const record = new McpIntegrationUserConfigRecord();
      record.id = configId;
      record.integrationId = integrationId;
      record.userId = userId;
      record.configValues = { personalToken: 'encrypted-user-token' };
      record.createdAt = now;
      record.updatedAt = now;

      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repository.findByIntegrationAndUser(
        integrationId,
        userId,
      );

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { integrationId, userId },
      });
      expect(result).toBeInstanceOf(McpIntegrationUserConfig);
      expect(result?.integrationId).toBe(integrationId);
      expect(result?.userId).toBe(userId);
    });

    it('should return null when no config exists', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByIntegrationAndUser(
        integrationId,
        userId,
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteByIntegrationId', () => {
    it('should delete all user configs for the given integration', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({
        affected: 3,
        raw: [],
      });

      await repository.deleteByIntegrationId(integrationId);

      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({ integrationId });
    });
  });
});
