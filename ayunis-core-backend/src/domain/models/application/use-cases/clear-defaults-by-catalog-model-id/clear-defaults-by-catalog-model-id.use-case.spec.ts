import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdUseCase } from './clear-defaults-by-catalog-model-id.use-case';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import type { UUID } from 'crypto';

describe('ClearDefaultsByCatalogModelIdUseCase', () => {
  let useCase: ClearDefaultsByCatalogModelIdUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;

  const mockCatalogModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  beforeEach(async () => {
    const mockPermittedModelsRepository = {
      unsetDefaultsByCatalogModelId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClearDefaultsByCatalogModelIdUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: mockPermittedModelsRepository,
        },
      ],
    }).compile();

    useCase = module.get(ClearDefaultsByCatalogModelIdUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('unsets permitted-model defaults for the given catalog model id', async () => {
    permittedModelsRepository.unsetDefaultsByCatalogModelId.mockResolvedValue();

    await useCase.execute(
      new ClearDefaultsByCatalogModelIdCommand(mockCatalogModelId),
    );

    expect(
      permittedModelsRepository.unsetDefaultsByCatalogModelId,
    ).toHaveBeenCalledWith(mockCatalogModelId);
  });
});
