import { randomUUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import { McpOAuthUserToken } from '../../../domain/mcp-oauth-user-token.entity';
import { McpOAuthUserTokenRepository } from './mcp-oauth-user-token.repository';
import { McpOAuthUserTokenRecord } from './schema/mcp-oauth-user-token.record';

describe('McpOAuthUserTokenRepository', () => {
  it('exposes locked save and delete operations in the same transaction', async () => {
    const integrationId = randomUUID();
    const userId = randomUUID();
    const record = new McpOAuthUserTokenRecord();
    record.id = randomUUID();
    record.integrationId = integrationId;
    record.userId = userId;
    record.issuer = 'https://login.example.gov';
    record.encryptedAccessToken = 'encrypted-old-access';
    record.scopes = ['openid'];
    record.createdAt = new Date('2026-08-03T10:00:00.000Z');
    record.updatedAt = record.createdAt;

    const transactionalRepository = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockImplementation(async (value) => value),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<McpOAuthUserTokenRecord>>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepository),
    } as unknown as jest.Mocked<EntityManager>;
    const typeOrmRepository = {
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(async (callback) => callback(manager)),
      },
    } as unknown as jest.Mocked<Repository<McpOAuthUserTokenRecord>>;
    const repository = new McpOAuthUserTokenRepository(typeOrmRepository);

    const result = await repository.withLockedToken(
      integrationId,
      userId,
      async (current, save, deleteLocked) => {
        const replacement = new McpOAuthUserToken({
          id: current?.id,
          integrationId,
          userId,
          issuer: 'https://login.example.gov',
          encryptedAccessToken: 'encrypted-new-access',
          scopes: ['openid'],
        });
        const saved = await save(replacement);
        await deleteLocked();
        return saved;
      },
    );

    expect(transactionalRepository.findOne).toHaveBeenCalledWith({
      where: { integrationId, userId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result.encryptedAccessToken).toBe('encrypted-new-access');
    expect(transactionalRepository.save).toHaveBeenCalledTimes(1);
    expect(transactionalRepository.delete).toHaveBeenCalledWith({
      integrationId,
      userId,
    });
  });
});
