import { randomUUID } from 'crypto';
import type { EntityManager, Repository } from 'typeorm';
import { McpOAuthPendingSession } from '../../../domain/mcp-oauth-pending-session.entity';
import { McpOAuthPendingSessionRepository } from './mcp-oauth-pending-session.repository';
import { McpOAuthPendingSessionRecord } from './schema/mcp-oauth-pending-session.record';

describe('McpOAuthPendingSessionRepository', () => {
  it('atomically consumes only an unconsumed session', async () => {
    const record = new McpOAuthPendingSessionRecord();
    record.id = randomUUID();
    record.integrationId = randomUUID();
    record.orgId = randomUUID();
    record.userId = randomUUID();
    record.stateHash = 'hashed-state';
    record.encryptedCodeVerifier = 'encrypted-verifier';
    record.redirectUri = 'https://core.example.gov/api/mcp/oauth/callback';
    record.issuer = 'https://login.example.gov';
    record.expiresAt = new Date('2026-08-03T10:05:00.000Z');
    record.createdAt = new Date('2026-08-03T10:00:00.000Z');
    record.updatedAt = record.createdAt;

    const transactionalRepository = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockImplementation(async (value) => value),
    } as unknown as jest.Mocked<Repository<McpOAuthPendingSessionRecord>>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepository),
    } as unknown as jest.Mocked<EntityManager>;
    const typeOrmRepository = {
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(async (callback) => callback(manager)),
      },
    } as unknown as jest.Mocked<Repository<McpOAuthPendingSessionRecord>>;
    const repository = new McpOAuthPendingSessionRepository(typeOrmRepository);
    const consumedAt = new Date('2026-08-03T10:01:00.000Z');

    const result = await repository.consumeByStateHash(
      'hashed-state',
      consumedAt,
    );

    expect(transactionalRepository.findOne).toHaveBeenCalledWith({
      where: { stateHash: 'hashed-state', consumedAt: expect.anything() },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result).toBeInstanceOf(McpOAuthPendingSession);
    expect(result?.consumedAt).toEqual(consumedAt);
  });
});
