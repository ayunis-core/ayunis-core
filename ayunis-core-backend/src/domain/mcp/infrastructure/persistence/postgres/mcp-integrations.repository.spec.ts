import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { McpIntegrationsRepository } from './mcp-integrations.repository';
import { McpIntegrationRecord } from './schema/mcp-integration.record';
import { McpIntegrationMapper } from './mappers/mcp-integration.mapper';
import { CustomMcpIntegration } from '../../../domain/integrations/custom-mcp-integration.entity';
import { BearerMcpIntegrationAuth } from '../../../domain/auth/bearer-mcp-integration-auth.entity';
import { McpIntegrationKind } from '../../../domain/value-objects/mcp-integration-kind.enum';

describe('McpIntegrationsRepository', () => {
  let repository: McpIntegrationsRepository;
  let ormRepository: jest.Mocked<Repository<McpIntegrationRecord>>;
  let mapper: McpIntegrationMapper;

  const integration = new CustomMcpIntegration({
    id: randomUUID(),
    orgId: randomUUID(),
    name: 'Test',
    serverUrl: 'https://example.com/mcp',
    auth: new BearerMcpIntegrationAuth({ authToken: 'encrypted-token' }),
  });

  beforeEach(async () => {
    ormRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpIntegrationsRepository,
        McpIntegrationMapper,
        {
          provide: getRepositoryToken(McpIntegrationRecord),
          useValue: ormRepository,
        },
      ],
    }).compile();

    repository = module.get(McpIntegrationsRepository);
    mapper = module.get(McpIntegrationMapper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saves integration using mapper and returns domain object', async () => {
    const record = mapper.toRecord(integration);
    ormRepository.save.mockResolvedValue(record);
    ormRepository.findOne.mockResolvedValue(record);

    const result = await repository.save(integration);

    expect(ormRepository.save).toHaveBeenCalledWith(
      expect.any(McpIntegrationRecord),
    );
    expect(result.kind).toBe(McpIntegrationKind.CUSTOM);
    expect(result.getAuthType()).toBe(integration.getAuthType());
  });

  it('finds integration by id', async () => {
    const record = mapper.toRecord(integration);
    ormRepository.findOne.mockResolvedValue(record);

    const result = await repository.findById(integration.id);

    expect(result?.id).toBe(integration.id);
    expect(ormRepository.findOne).toHaveBeenCalledWith({
      where: { id: integration.id },
    });
  });

  it('finds all integrations for org', async () => {
    const record = mapper.toRecord(integration);
    ormRepository.find.mockResolvedValue([record]);

    const result = await repository.findAll(integration.orgId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(integration.id);
  });

  it('deletes integration by id', async () => {
    await repository.delete(integration.id);

    expect(ormRepository.delete).toHaveBeenCalledWith({ id: integration.id });
  });
});
