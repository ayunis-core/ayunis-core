import { LocalPermittedModelsRepository } from './local-permitted-models.repository';
import type { PermittedModelMapper } from './mappers/permitted-model.mapper';
import { PermittedModelRecord } from './schema/permitted-model.record';
import { ImageGenerationModelRecord } from '../local-models/schema/model.record';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import {
  PermittedImageGenerationModel,
  PermittedModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { PermittedModelQueryService } from './permitted-model-query.service';
import type { Repository } from 'typeorm';
import type { UUID } from 'crypto';

describe('LocalPermittedModelsRepository', () => {
  let repository: LocalPermittedModelsRepository;
  let permittedModelRepository: jest.Mocked<Repository<PermittedModelRecord>>;
  let permittedModelMapper: jest.Mocked<PermittedModelMapper>;
  let queryService: PermittedModelQueryService;

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const catalogModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const newPermittedModelId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  beforeEach(() => {
    permittedModelRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      manager: { transaction: jest.fn() },
    } as unknown as jest.Mocked<Repository<PermittedModelRecord>>;

    permittedModelMapper = {
      toDomain: jest.fn(),
      toRecord: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelMapper>;

    queryService = new PermittedModelQueryService(
      permittedModelRepository,
      permittedModelMapper,
    );

    repository = new LocalPermittedModelsRepository(
      permittedModelRepository,
      permittedModelMapper,
      queryService,
    );
  });

  const createImageModel = (id: UUID = catalogModelId): ImageGenerationModel =>
    new ImageGenerationModel({
      id,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });

  const createImageRecord = (
    modelId: UUID = catalogModelId,
    isArchived = false,
  ): ImageGenerationModelRecord => {
    const record = new ImageGenerationModelRecord();
    record.id = modelId;
    record.name = 'gpt-image-1';
    record.provider = ModelProvider.AZURE;
    record.displayName = 'GPT Image 1';
    record.isArchived = isArchived;
    return record;
  };

  const createPermittedImageModel = (params: {
    permittedModelId: UUID;
    modelId?: UUID;
  }): PermittedImageGenerationModel =>
    new PermittedImageGenerationModel({
      id: params.permittedModelId,
      model: createImageModel(params.modelId),
      orgId,
      anonymousOnly: false,
      isDefault: false,
      scope: PermittedModelScope.ORG,
    });

  it('creates a single image-generation permitted model', async () => {
    const permittedModel = new PermittedModel({
      id: newPermittedModelId,
      model: createImageModel(),
      orgId,
      anonymousOnly: true,
    });
    const savedRecord = new PermittedModelRecord();
    savedRecord.id = newPermittedModelId;
    savedRecord.orgId = orgId;
    savedRecord.modelId = catalogModelId;
    savedRecord.model = createImageRecord();
    savedRecord.scope = PermittedModelScope.ORG;
    savedRecord.isDefault = false;
    savedRecord.anonymousOnly = true;

    permittedModelMapper.toRecord.mockReturnValue(savedRecord);
    permittedModelRepository.save.mockResolvedValue(savedRecord);
    permittedModelRepository.findOneOrFail.mockResolvedValue(savedRecord);
    permittedModelMapper.toDomain.mockReturnValue(
      createPermittedImageModel({ permittedModelId: newPermittedModelId }),
    );

    const result = await repository.create(permittedModel);

    expect(permittedModelRepository.save).toHaveBeenCalledWith(savedRecord);
    expect(result).toBeInstanceOf(PermittedImageGenerationModel);
    expect(result.model.provider).toBe(ModelProvider.AZURE);
  });

  it('creates a team-scoped image-generation permitted model', async () => {
    const teamId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
    const permittedModel = new PermittedModel({
      id: newPermittedModelId,
      model: createImageModel(),
      orgId,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
    });
    const savedRecord = new PermittedModelRecord();
    savedRecord.id = newPermittedModelId;
    savedRecord.orgId = orgId;
    savedRecord.modelId = catalogModelId;
    savedRecord.model = createImageRecord();
    savedRecord.scope = PermittedModelScope.TEAM;
    savedRecord.scopeId = teamId;
    savedRecord.isDefault = false;
    savedRecord.anonymousOnly = false;

    permittedModelMapper.toRecord.mockReturnValue(savedRecord);
    permittedModelRepository.save.mockResolvedValue(savedRecord);
    permittedModelRepository.findOneOrFail.mockResolvedValue(savedRecord);
    permittedModelMapper.toDomain.mockReturnValue(
      createPermittedImageModel({ permittedModelId: newPermittedModelId }),
    );

    const result = await repository.create(permittedModel);

    expect(permittedModelRepository.save).toHaveBeenCalledWith(savedRecord);
    expect(result).toBeInstanceOf(PermittedImageGenerationModel);
  });
});
