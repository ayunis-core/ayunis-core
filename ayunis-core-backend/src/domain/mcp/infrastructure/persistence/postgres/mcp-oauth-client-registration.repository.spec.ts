import { randomUUID } from 'crypto';
import { Not, type EntityManager, type Repository } from 'typeorm';
import { McpOAuthClientRegistration } from '../../../domain/mcp-oauth-client-registration.entity';
import { McpOAuthClientRegistrationRepository } from './mcp-oauth-client-registration.repository';
import { McpOAuthClientRegistrationRecord } from './schema/mcp-oauth-client-registration.record';

describe('McpOAuthClientRegistrationRepository', () => {
  it('checks for a persisted static registration', async () => {
    const integrationId = randomUUID();
    const typeOrmRepository = {
      exists: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<Repository<McpOAuthClientRegistrationRecord>>;
    const repository = new McpOAuthClientRegistrationRepository(
      typeOrmRepository,
    );

    await expect(repository.hasStaticRegistration(integrationId)).resolves.toBe(
      true,
    );
    expect(typeOrmRepository.exists).toHaveBeenCalledWith({
      where: { integrationId, registrationMode: 'static' },
    });
  });

  it('atomically binds the single unbound registration to an issuer', async () => {
    const integrationId = randomUUID();
    const record = new McpOAuthClientRegistrationRecord();
    record.id = randomUUID();
    record.integrationId = integrationId;
    record.issuer = null;
    record.registrationMode = 'static';
    record.clientId = 'static-ayunis-client';
    record.createdAt = new Date('2026-08-03T10:00:00.000Z');
    record.updatedAt = record.createdAt;

    const transactionalRepository = {
      findOne: jest.fn().mockResolvedValue(record),
      save: jest.fn().mockImplementation(async (value) => value),
    } as unknown as jest.Mocked<Repository<McpOAuthClientRegistrationRecord>>;
    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionalRepository),
    } as unknown as jest.Mocked<EntityManager>;
    const typeOrmRepository = {
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(async (callback) => callback(manager)),
      },
    } as unknown as jest.Mocked<Repository<McpOAuthClientRegistrationRecord>>;
    const repository = new McpOAuthClientRegistrationRepository(
      typeOrmRepository,
    );

    const result = await repository.bindUnboundToIssuer(
      integrationId,
      'https://login.example.gov',
    );

    expect(transactionalRepository.findOne).toHaveBeenCalledWith({
      where: { integrationId, issuer: expect.anything() },
      lock: { mode: 'pessimistic_write' },
    });
    expect(result).toBeInstanceOf(McpOAuthClientRegistration);
    expect(result?.issuer).toBe('https://login.example.gov');
  });

  it('deletes stale registrations while preserving the replacement', async () => {
    const integrationId = randomUUID();
    const registrationId = randomUUID();
    const typeOrmRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    } as unknown as jest.Mocked<Repository<McpOAuthClientRegistrationRecord>>;
    const repository = new McpOAuthClientRegistrationRepository(
      typeOrmRepository,
    );

    await repository.deleteByIntegrationExcept(integrationId, registrationId);

    expect(typeOrmRepository.delete).toHaveBeenCalledWith({
      integrationId,
      id: Not(registrationId),
    });
  });
});
