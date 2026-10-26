import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { createLoggerMock } from 'src/common/testing/logger.mock';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { createDefaultModelSelectionsFake } from 'src/domain/models/testing/default-model-selections.fake';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { ClearDefaultsByCatalogModelIdUseCase } from './clear-defaults-by-catalog-model-id.use-case';

describe('ClearDefaultsByCatalogModelIdUseCase', () => {
  const logger = createLoggerMock();
  let useCase: ClearDefaultsByCatalogModelIdUseCase;
  let selections: ReturnType<typeof createDefaultModelSelectionsFake>;

  beforeEach(async () => {
    selections = createDefaultModelSelectionsFake();
    const module = await Test.createTestingModule({
      providers: [
        ClearDefaultsByCatalogModelIdUseCase,
        {
          provide: DefaultModelSelectionsRepository,
          useValue: selections.repo,
        },
      ],
    }).compile();
    useCase = module.get(ClearDefaultsByCatalogModelIdUseCase);
    logger.log.mockImplementation();
  });

  it('removes every user, team and org default pointing at the catalog model', async () => {
    const catalogModelId = randomUUID();

    await useCase.execute(
      new ClearDefaultsByCatalogModelIdCommand(catalogModelId),
    );

    expect(selections.repo.deleteByCatalogModelId).toHaveBeenCalledWith(
      catalogModelId,
    );
  });

  it('propagates a repository failure', async () => {
    selections.repo.deleteByCatalogModelId.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute(new ClearDefaultsByCatalogModelIdCommand(randomUUID())),
    ).rejects.toThrow('connection lost');
  });
});
