import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedEmbeddingModelNotFoundForOrgError } from '../../models.errors';
import { GetPermittedEmbeddingModelQuery } from './get-permitted-embedding-model.query';
import { GetPermittedEmbeddingModelUseCase } from './get-permitted-embedding-model.use-case';

describe('GetPermittedEmbeddingModelUseCase', () => {
  const orgId = randomUUID();

  let useCase: GetPermittedEmbeddingModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneEmbedding: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    contextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return orgId;
        if (key === 'systemRole') return SystemRole.CUSTOMER;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module = await Test.createTestingModule({
      providers: [
        GetPermittedEmbeddingModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetPermittedEmbeddingModelUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an org-scoped not-found error when no embedding model is permitted', async () => {
    permittedModelsRepository.findOneEmbedding.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetPermittedEmbeddingModelQuery({ orgId })),
    ).rejects.toThrow(
      new PermittedEmbeddingModelNotFoundForOrgError(orgId).message,
    );
  });
});
