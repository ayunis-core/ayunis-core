import { randomUUID } from 'crypto';
import { IsNull } from 'typeorm';
import type { Repository } from 'typeorm';
import { McpIntegrationOAuthTokenRepository } from './mcp-integration-oauth-token.repository';
import { McpIntegrationOAuthTokenRecord } from './schema/mcp-integration-oauth-token.record';
import { McpIntegrationOAuthToken } from '../../../domain/mcp-integration-oauth-token.entity';

class MockQueryBuilder {
  private conditions: { where?: string; params?: Record<string, unknown> }[] =
    [];
  delete = jest.fn().mockReturnThis();
  where = jest.fn((condition: string, params?: Record<string, unknown>) => {
    this.conditions.push({ where: condition, params });
    return this;
  });
  andWhere = jest.fn((condition: string, params?: Record<string, unknown>) => {
    this.conditions.push({ where: condition, params });
    return this;
  });
  execute = jest.fn().mockResolvedValue({ affected: 1, raw: [] });
}

describe('McpIntegrationOAuthTokenRepository', () => {
  let repository: McpIntegrationOAuthTokenRepository;
  let mockTypeOrmRepo: jest.Mocked<Repository<McpIntegrationOAuthTokenRecord>>;

  const integrationId = randomUUID();
  const userId = randomUUID();
  const tokenId = randomUUID();
  const now = new Date('2026-01-15T10:00:00.000Z');

  beforeEach(() => {
    mockTypeOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(new MockQueryBuilder()),
    } as unknown as jest.Mocked<Repository<McpIntegrationOAuthTokenRecord>>;

    repository = new McpIntegrationOAuthTokenRepository(mockTypeOrmRepo);
  });

  const buildToken = (overrides?: Partial<McpIntegrationOAuthToken>) =>
    new McpIntegrationOAuthToken({
      id: tokenId,
      integrationId,
      userId,
      accessTokenEncrypted: 'encrypted-access-token',
      refreshTokenEncrypted: 'encrypted-refresh-token',
      tokenExpiresAt: new Date('2026-01-15T11:00:00.000Z'),
      scope: 'read write',
      createdAt: now,
      updatedAt: now,
      ...overrides,
    });

  const buildRecord = (): McpIntegrationOAuthTokenRecord => {
    const record = new McpIntegrationOAuthTokenRecord();
    record.id = tokenId;
    record.integrationId = integrationId;
    record.userId = userId;
    record.accessTokenEncrypted = 'encrypted-access-token';
    record.refreshTokenEncrypted = 'encrypted-refresh-token';
    record.tokenExpiresAt = new Date('2026-01-15T11:00:00.000Z');
    record.scope = 'read write';
    record.createdAt = now;
    record.updatedAt = now;
    return record;
  };

  describe('save', () => {
    it('should persist token and return domain entity', async () => {
      const token = buildToken();
      const savedRecord = buildRecord();
      mockTypeOrmRepo.save.mockResolvedValue(savedRecord);

      const result = await repository.save(token);

      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tokenId,
          integrationId,
          userId,
          accessTokenEncrypted: 'encrypted-access-token',
          refreshTokenEncrypted: 'encrypted-refresh-token',
        }),
      );
      expect(result).toBeInstanceOf(McpIntegrationOAuthToken);
      expect(result.id).toBe(tokenId);
      expect(result.accessTokenEncrypted).toBe('encrypted-access-token');
    });

    it('should handle org-level token (null userId)', async () => {
      const token = buildToken({ userId: null });
      const record = buildRecord();
      record.userId = null;
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repository.save(token);

      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
      expect(result.userId).toBeNull();
    });

    it('should handle token without optional fields', async () => {
      const token = buildToken({
        refreshTokenEncrypted: undefined,
        tokenExpiresAt: undefined,
        scope: undefined,
      });
      const record = buildRecord();
      record.refreshTokenEncrypted = null;
      record.tokenExpiresAt = null;
      record.scope = null;
      mockTypeOrmRepo.save.mockResolvedValue(record);

      const result = await repository.save(token);

      expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshTokenEncrypted: null,
          tokenExpiresAt: null,
          scope: null,
        }),
      );
      expect(result.refreshTokenEncrypted).toBeUndefined();
      expect(result.tokenExpiresAt).toBeUndefined();
      expect(result.scope).toBeUndefined();
    });
  });

  describe('findByIntegrationAndUser', () => {
    it('should return domain entity for user-level token', async () => {
      const record = buildRecord();
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repository.findByIntegrationAndUser(
        integrationId,
        userId,
      );

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { integrationId, userId },
      });
      expect(result).toBeInstanceOf(McpIntegrationOAuthToken);
      expect(result?.integrationId).toBe(integrationId);
      expect(result?.userId).toBe(userId);
    });

    it('should query with IS NULL for org-level token', async () => {
      const record = buildRecord();
      record.userId = null;
      mockTypeOrmRepo.findOne.mockResolvedValue(record);

      const result = await repository.findByIntegrationAndUser(
        integrationId,
        null,
      );

      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { integrationId, userId: IsNull() },
      });
      expect(result).toBeInstanceOf(McpIntegrationOAuthToken);
      expect(result?.userId).toBeNull();
    });

    it('should return null when no token exists', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);

      const result = await repository.findByIntegrationAndUser(
        integrationId,
        userId,
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteByIntegrationAndUser', () => {
    it('should delete by integrationId and userId', async () => {
      const qb = new MockQueryBuilder();
      mockTypeOrmRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await repository.deleteByIntegrationAndUser(integrationId, userId);

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('integration_id = :integrationId', {
        integrationId,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('user_id = :userId', {
        userId,
      });
      expect(qb.execute).toHaveBeenCalled();
    });

    it('should delete with IS NULL for org-level token', async () => {
      const qb = new MockQueryBuilder();
      mockTypeOrmRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await repository.deleteByIntegrationAndUser(integrationId, null);

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('integration_id = :integrationId', {
        integrationId,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('user_id IS NULL', {});
      expect(qb.execute).toHaveBeenCalled();
    });
  });

  describe('deleteAllByIntegration', () => {
    it('should delete all tokens for the given integration', async () => {
      mockTypeOrmRepo.delete.mockResolvedValue({ affected: 3, raw: [] });

      await repository.deleteAllByIntegration(integrationId);

      expect(mockTypeOrmRepo.delete).toHaveBeenCalledWith({ integrationId });
    });
  });
});
