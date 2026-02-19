import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DeleteOrgUseCase } from './delete-org.use-case';
import { DeleteOrgCommand } from './delete-org.command';
import { OrgsRepository } from '../../ports/orgs.repository';
import { OrgDeletionFailedError } from '../../orgs.errors';
import type { UUID } from 'crypto';

describe('DeleteOrgUseCase', () => {
  let useCase: DeleteOrgUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;

  beforeEach(async () => {
    mockOrgsRepository = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteOrgUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
      ],
    }).compile();

    useCase = module.get<DeleteOrgUseCase>(DeleteOrgUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should delete organization successfully', async () => {
    const command = new DeleteOrgCommand('org-id' as UUID);

    jest.spyOn(mockOrgsRepository, 'delete').mockResolvedValue(undefined);

    await useCase.execute(command);

    expect(mockOrgsRepository.delete).toHaveBeenCalledWith('org-id');
  });

  it('should throw OrgDeletionFailedError for unexpected errors', async () => {
    const command = new DeleteOrgCommand('org-id' as UUID);

    jest
      .spyOn(mockOrgsRepository, 'delete')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgDeletionFailedError,
    );
  });
});
