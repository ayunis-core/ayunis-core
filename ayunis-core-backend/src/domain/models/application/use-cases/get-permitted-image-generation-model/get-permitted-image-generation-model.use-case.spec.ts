import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedImageGenerationModelNotFoundForOrgError } from '../../models.errors';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';
import { GetPermittedImageGenerationModelUseCase } from './get-permitted-image-generation-model.use-case';

describe('GetPermittedImageGenerationModelUseCase', () => {
  const orgId = randomUUID();

  let useCase: GetPermittedImageGenerationModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneImageGeneration: jest.fn(),
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
        GetPermittedImageGenerationModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetPermittedImageGenerationModelUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an org-scoped not-found error when no image generation model is permitted', async () => {
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(
      new PermittedImageGenerationModelNotFoundForOrgError(orgId).message,
    );
  });
});
