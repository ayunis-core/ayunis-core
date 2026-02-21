import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { CreateOrgUseCase } from './create-org.use-case';
import { CreateOrgCommand } from './create-org.command';
import { OrgsRepository } from '../../ports/orgs.repository';
import { Org } from '../../../domain/org.entity';
import { OrgCreationFailedError } from '../../orgs.errors';
import type { UUID } from 'crypto';

describe('CreateOrgUseCase', () => {
  let useCase: CreateOrgUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;

  beforeAll(async () => {
    mockOrgsRepository = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrgUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
      ],
    }).compile();

    useCase = module.get<CreateOrgUseCase>(CreateOrgUseCase);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create organization successfully', async () => {
    const command = new CreateOrgCommand('Test Organization');
    const mockOrg = new Org({
      id: 'org-id' as UUID,
      name: 'Test Organization',
    });

    jest.spyOn(mockOrgsRepository, 'create').mockResolvedValue(mockOrg);

    const result = await useCase.execute(command);

    expect(result).toBe(mockOrg);
    expect(mockOrgsRepository.create).toHaveBeenCalledWith(expect.any(Org));
    expect(mockOrgsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Organization' }),
    );
  });

  it('should throw OrgCreationFailedError for empty name', async () => {
    const command = new CreateOrgCommand('');

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
  });

  it('should throw OrgCreationFailedError for whitespace-only name', async () => {
    const command = new CreateOrgCommand('   ');

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
  });

  it('should throw OrgCreationFailedError for unexpected errors', async () => {
    const command = new CreateOrgCommand('Test Organization');

    jest
      .spyOn(mockOrgsRepository, 'create')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(command)).rejects.toThrow(
      OrgCreationFailedError,
    );
  });
});
