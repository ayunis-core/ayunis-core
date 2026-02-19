import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';
import { McpIntegrationsRepository } from './mcp-integrations.repository';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { McpIntegrationAuthRecord } from './schema/mcp-integration-auth.record';
import type { PredefinedMcpIntegrationRecord } from './schema/predefined-mcp-integration.record';
import { McpIntegrationMapper } from './mappers/mcp-integration.mapper';
import { McpIntegrationFactory } from '../../../application/factories/mcp-integration.factory';
import { McpIntegrationAuthFactory } from '../../../application/factories/mcp-integration-auth.factory';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { PredefinedMcpIntegration } from '../../../domain/integrations/predefined-mcp-integration.entity';
import { NoAuthMcpIntegrationAuth } from '../../../domain/auth/no-auth-mcp-integration-auth.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';
import { PredefinedMcpIntegrationSlug } from '../../../domain/value-objects/predefined-mcp-integration-slug.enum';

class InMemoryRepository<T extends { id: string }> {
  save = jest.fn(async (entity: T) => entity);
  findOne = jest
    .fn<Promise<T | null>, [{ where: Partial<T> }]>()
    .mockResolvedValue(null);
  find = jest
    .fn<Promise<T[]>, [{ where?: Partial<T> }]>()
    .mockResolvedValue([]);
  delete = jest.fn();
  manager: {
    transaction: jest.Mock;
  } = {
    transaction: jest.fn(),
  };
}

describe('McpIntegrationsRepository', () => {
  let repository: McpIntegrationsRepository;
  let ormRepository: InMemoryRepository<McpIntegrationRecord>;
  let authRepository: InMemoryRepository<McpIntegrationAuthRecord>;
  let predefinedRepository: InMemoryRepository<PredefinedMcpIntegrationRecord>;
  let mapper: McpIntegrationMapper;

  beforeEach(() => {
    ormRepository = new InMemoryRepository<McpIntegrationRecord>();
    authRepository = new InMemoryRepository<McpIntegrationAuthRecord>();
    predefinedRepository =
      new InMemoryRepository<PredefinedMcpIntegrationRecord>();
    mapper = new McpIntegrationMapper(
      new McpIntegrationFactory(),
      new McpIntegrationAuthFactory(),
    );

    const transactionalEntityManager = {
      getRepository: jest.fn((entity) => {
        if (entity === McpIntegrationRecord) {
          return ormRepository;
        }
        if (entity === McpIntegrationAuthRecord) {
          return authRepository;
        }
        throw new Error(`Unexpected repository request for ${entity}`);
      }),
    };

    ormRepository.manager.transaction.mockImplementation(async (cb) => {
      await cb(transactionalEntityManager);
    });

    repository = new McpIntegrationsRepository(
      ormRepository as unknown as Repository<McpIntegrationRecord>,
      authRepository as unknown as Repository<McpIntegrationAuthRecord>,
      predefinedRepository as unknown as Repository<PredefinedMcpIntegrationRecord>,
      mapper,
    );
  });

  const buildCustomIntegration = () =>
    new CustomMcpIntegration({
      id: randomUUID(),
      orgId: randomUUID(),
      name: 'Custom Integration',
      serverUrl: 'https://example.com/mcp',
      auth: new NoAuthMcpIntegrationAuth(),
    });

  const buildPredefinedRecord = () => {
    const integration = new PredefinedMcpIntegration({
      id: randomUUID(),
      orgId: randomUUID(),
      name: 'Locaboo 4',
      slug: PredefinedMcpIntegrationSlug.LOCABOO,
      serverUrl: 'https://api.locaboo.example.com/mcp',
      auth: new BearerMcpIntegrationAuth({ authToken: 'token' }),
    });
    return mapper.toRecord(integration) as PredefinedMcpIntegrationRecord;
  };

  it('saves integration using mapper and returns domain object', async () => {
    const integration = buildCustomIntegration();
    const persistedRecord = mapper.toRecord(integration);
    const authRecord = persistedRecord.auth;

    ormRepository.save.mockResolvedValue(persistedRecord);
    authRepository.save.mockResolvedValue(authRecord);
    ormRepository.findOne.mockResolvedValue(persistedRecord);

    const result = await repository.save(integration);

    expect(ormRepository.save).toHaveBeenCalledTimes(1);
    expect(authRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ integrationId: persistedRecord.id }),
    );
    expect(result.kind).toBe(McpIntegrationKind.CUSTOM);
    expect(result.serverUrl).toBe(integration.serverUrl);
  });

  it('finds integration by id', async () => {
    const integration = buildCustomIntegration();
    const record = mapper.toRecord(integration);

    ormRepository.findOne.mockResolvedValue(record);

    const result = await repository.findById(integration.id);

    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: integration.id },
    });
    expect(result?.id).toBe(integration.id);
  });

  it('finds all integrations for org', async () => {
    const integration = buildCustomIntegration();
    const record = mapper.toRecord(integration);

    ormRepository.find.mockResolvedValue([record]);

    const result = await repository.findAll(integration.orgId);

    expect(ormRepository.find).toHaveBeenCalledWith({
      where: { orgId: integration.orgId },
      order: { createdAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(integration.id);
  });

  it('finds predefined integration by org and slug', async () => {
    const record = buildPredefinedRecord();
    predefinedRepository.findOne.mockResolvedValue(record);

    const result = await repository.findByOrgIdAndSlug(
      record.orgId,
      PredefinedMcpIntegrationSlug.LOCABOO,
    );

    expect(predefinedRepository.findOne).toHaveBeenCalledWith({
      where: {
        orgId: record.orgId,
        predefinedSlug: PredefinedMcpIntegrationSlug.LOCABOO,
      },
      relations: { auth: true },
    });
    expect(result).toBeInstanceOf(PredefinedMcpIntegration);
    const predefined = result as PredefinedMcpIntegration | null;
    expect(predefined?.slug).toBe(PredefinedMcpIntegrationSlug.LOCABOO);
  });

  it('returns null when predefined integration not found', async () => {
    predefinedRepository.findOne.mockResolvedValue(null);

    const result = await repository.findByOrgIdAndSlug(
      randomUUID(),
      PredefinedMcpIntegrationSlug.TEST,
    );

    expect(result).toBeNull();
  });

  it('deletes integration by id', async () => {
    const integration = buildCustomIntegration();

    await repository.delete(integration.id);

    expect(ormRepository.delete).toHaveBeenCalledWith({ id: integration.id });
  });
});
