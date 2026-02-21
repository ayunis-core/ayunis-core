import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateOrgUseCase } from './update-org.use-case';
import { UpdateOrgCommand } from './update-org.command';
import { OrgsRepository } from '../../ports/orgs.repository';
import { Org } from '../../../domain/org.entity';
import { OrgUpdateFailedError } from '../../orgs.errors';
import type { UUID } from 'crypto';

describe('UpdateOrgUseCase', () => {
  let useCase: UpdateOrgUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;

  beforeAll(async () => {
    mockOrgsRepository = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateOrgUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
      ],
    }).compile();

    useCase = module.get<UpdateOrgUseCase>(UpdateOrgUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should update organization successfully', async () => {
    const org = new Org({
      id: 'org-id' as UUID,
      name: 'Updated Organization',
    });
    const command = new UpdateOrgCommand(org);

    jest.spyOn(mockOrgsRepository, 'update').mockResolvedValue(org);

    const result = await useCase.execute(command);

    expect(result).toBe(org);
    expect(mockOrgsRepository.update).toHaveBeenCalledWith(org);
  });

  it('should throw OrgUpdateFailedError for unexpected errors', async () => {
    const org = new Org({
      id: 'org-id' as UUID,
      name: 'Updated Organization',
    });
    const command = new UpdateOrgCommand(org);

    jest
      .spyOn(mockOrgsRepository, 'update')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgUpdateFailedError,
    );
  });
});
