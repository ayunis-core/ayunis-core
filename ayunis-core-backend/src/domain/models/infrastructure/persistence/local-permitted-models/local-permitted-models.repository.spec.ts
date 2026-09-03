import { QueryFailedError, type EntityManager, type Repository } from 'typeorm';
import {
  DuplicateTeamPermittedModelError,
  MultipleTeamImageGenerationModelsNotAllowedError,
} from 'src/domain/models/application/models.errors';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  PermittedImageGenerationModel,
  PermittedLanguageModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';
import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import type { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { PermittedModelFinder } from './permitted-model-finder';
import { PermittedModelRecord } from './schema/permitted-model.record';
import type { UUID } from 'crypto';

const TEAM_MODEL_UNIQUE_INDEX = 'IDX_2d4c91a8c18766bbbcba842d07';

describe('LocalPermittedModelsRepository', () => {
  let repository: LocalPermittedModelsRepository;
  let permittedModelRepository: jest.Mocked<Repository<PermittedModelRecord>>;
  let transactionRepository: jest.Mocked<Repository<PermittedModelRecord>>;
  let permittedModelMapper: jest.Mocked<PermittedModelMapper>;
  let entityManager: jest.Mocked<EntityManager>;

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const teamId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
  const catalogModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const alternativeCatalogModelId =
    '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const permittedModelId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  beforeEach(() => {
    transactionRepository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<PermittedModelRecord>>;
    entityManager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue(transactionRepository),
    } as unknown as jest.Mocked<EntityManager>;
    permittedModelRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(
            async (work: (manager: EntityManager) => Promise<PermittedModel>) =>
              work(entityManager),
          ),
      },
    } as unknown as jest.Mocked<Repository<PermittedModelRecord>>;
    permittedModelMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelMapper>;

    const finder = new PermittedModelFinder(
      permittedModelRepository,
      permittedModelMapper,
    );
    repository = new LocalPermittedModelsRepository(
      permittedModelRepository,
      permittedModelMapper,
      finder,
    );
  });

  const createLanguageModel = (): LanguageModel =>
    new LanguageModel({
      id: catalogModelId,
      name: 'municipal-assistant',
      provider: ModelProvider.OPENAI,
      displayName: 'Municipal Assistant',
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: true,
      isArchived: false,
    });

  const createImageModel = (id: UUID = catalogModelId): ImageGenerationModel =>
    new ImageGenerationModel({
      id,
      name: 'municipal-image-generator',
      provider: ModelProvider.AZURE,
      displayName: 'Municipal Image Generator',
      isArchived: false,
    });

  const createTeamGrant = (
    model: LanguageModel | ImageGenerationModel,
  ): PermittedModel =>
    new PermittedModel({
      id: permittedModelId,
      model,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });

  const createRecord = (
    modelId: UUID = catalogModelId,
  ): PermittedModelRecord => {
    const record = new PermittedModelRecord();
    record.id = permittedModelId;
    record.orgId = orgId;
    record.modelId = modelId;
    record.scope = PermittedModelScope.TEAM;
    record.scopeId = teamId;
    record.isDefault = false;
    record.anonymousOnly = false;
    return record;
  };

  it('creates a unique team language grant through the existing team-model constraint', async () => {
    const model = createLanguageModel();
    const grant = createTeamGrant(model);
    const record = createRecord();
    const created = new PermittedLanguageModel({
      id: permittedModelId,
      model,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelMapper.toRecord.mockReturnValue(record);
    permittedModelRepository.save.mockResolvedValue(record);
    permittedModelRepository.findOneOrFail.mockResolvedValue(record);
    permittedModelMapper.toDomain.mockReturnValue(created);

    const result = await repository.createTeamScoped(grant);

    expect(result).toBe(created);
    expect(permittedModelRepository.save).toHaveBeenCalledWith(record);
  });

  it('maps concurrent duplicate team grants to a typed conflict', async () => {
    const grant = createTeamGrant(createLanguageModel());
    const record = createRecord();
    const driverError = Object.assign(new Error('duplicate team grant'), {
      code: '23505',
      constraint: TEAM_MODEL_UNIQUE_INDEX,
    });
    permittedModelMapper.toRecord.mockReturnValue(record);
    permittedModelRepository.save.mockRejectedValue(
      new QueryFailedError('INSERT INTO permitted_models', [], driverError),
    );

    await expect(repository.createTeamScoped(grant)).rejects.toThrow(
      DuplicateTeamPermittedModelError,
    );
  });

  it('serializes image grants per team before checking the singleton policy', async () => {
    const imageModel = createImageModel();
    const grant = createTeamGrant(imageModel);
    const record = createRecord();
    const created = new PermittedImageGenerationModel({
      id: permittedModelId,
      model: imageModel,
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    permittedModelMapper.toRecord.mockReturnValue(record);
    transactionRepository.findOne.mockResolvedValue(null);
    transactionRepository.save.mockResolvedValue(record);
    transactionRepository.findOneOrFail.mockResolvedValue(record);
    permittedModelMapper.toDomain.mockReturnValue(created);

    const result = await repository.createTeamScoped(grant);

    expect(result).toBe(created);
    expect(entityManager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`team-image-grant:${teamId}`],
    );
    expect(entityManager.query.mock.invocationCallOrder[0]).toBeLessThan(
      transactionRepository.findOne.mock.invocationCallOrder[0],
    );
  });

  it('rejects the same image grant as a duplicate after taking the team lock', async () => {
    const grant = createTeamGrant(createImageModel());
    const existing = createRecord();
    transactionRepository.findOne.mockResolvedValue(existing);

    await expect(repository.createTeamScoped(grant)).rejects.toThrow(
      DuplicateTeamPermittedModelError,
    );
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a different second image grant after taking the team lock', async () => {
    const grant = createTeamGrant(createImageModel(alternativeCatalogModelId));
    const existing = createRecord(catalogModelId);
    transactionRepository.findOne.mockResolvedValue(existing);

    await expect(repository.createTeamScoped(grant)).rejects.toThrow(
      MultipleTeamImageGenerationModelsNotAllowedError,
    );
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('loads language grants for deduplicated team IDs in one query', async () => {
    permittedModelRepository.find.mockResolvedValue([]);

    await repository.findManyLanguageByTeams([teamId, teamId], orgId);

    expect(permittedModelRepository.find).toHaveBeenCalledTimes(1);
    expect(permittedModelRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId,
          scope: PermittedModelScope.TEAM,
          scopeId: expect.objectContaining({ _value: [teamId] }),
          model: expect.objectContaining({ type: ModelType.LANGUAGE }),
        }),
      }),
    );
  });

  it('loads image grants for all team IDs in one type-filtered query', async () => {
    const secondTeamId = '123e4567-e89b-12d3-a456-426614174098' as UUID;
    permittedModelRepository.find.mockResolvedValue([]);

    await repository.findManyImageGenerationByTeams(
      [teamId, secondTeamId],
      orgId,
    );

    expect(permittedModelRepository.find).toHaveBeenCalledTimes(1);
    expect(permittedModelRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId,
          scope: PermittedModelScope.TEAM,
          scopeId: expect.objectContaining({
            _value: [teamId, secondTeamId],
          }),
          model: expect.objectContaining({
            type: ModelType.IMAGE_GENERATION,
          }),
        }),
      }),
    );
  });

  it('queries every image grant when enforcing the team singleton', async () => {
    const grant = createTeamGrant(createImageModel());
    const record = createRecord();
    const modelRecord = new LanguageModelRecord();
    record.model = modelRecord;
    permittedModelMapper.toRecord.mockReturnValue(record);
    transactionRepository.findOne.mockResolvedValue(null);
    transactionRepository.save.mockResolvedValue(record);
    transactionRepository.findOneOrFail.mockResolvedValue(record);
    permittedModelMapper.toDomain.mockReturnValue(
      new PermittedImageGenerationModel({
        id: permittedModelId,
        model: createImageModel(),
        orgId,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
      }),
    );

    await repository.createTeamScoped(grant);

    expect(transactionRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId,
          scopeId: teamId,
          scope: PermittedModelScope.TEAM,
          model: expect.objectContaining({
            type: 'image-generation',
          }),
        }),
      }),
    );
  });
});
