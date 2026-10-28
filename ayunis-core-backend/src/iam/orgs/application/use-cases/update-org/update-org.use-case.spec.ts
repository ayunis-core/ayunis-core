import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { UpdateOrgUseCase } from './update-org.use-case';
import { UpdateOrgCommand } from './update-org.command';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  OrgNotFoundError,
  OrgUpdateFailedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import type { UUID } from 'crypto';

const ORG_ID = '11111111-1111-1111-1111-111111111111' as UUID;

describe('UpdateOrgUseCase', () => {
  let useCase: UpdateOrgUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;

  beforeAll(async () => {
    mockOrgsRepository = {
      updateName: jest.fn(),
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
    const org = new Org({ id: ORG_ID, name: 'Updated Organization' });
    jest.spyOn(mockOrgsRepository, 'updateName').mockResolvedValue(org);

    const result = await useCase.execute(
      new UpdateOrgCommand(ORG_ID, 'Updated Organization'),
    );

    expect(result).toBe(org);
    expect(mockOrgsRepository.updateName).toHaveBeenCalledWith(
      ORG_ID,
      'Updated Organization',
    );
  });

  it.each(['', '   '])(
    'should reject the name %p without touching the repository',
    async (name) => {
      await expect(
        useCase.execute(new UpdateOrgCommand(ORG_ID, name)),
      ).rejects.toThrow(OrgUpdateFailedError);

      expect(mockOrgsRepository.updateName).not.toHaveBeenCalled();
    },
  );

  it('should propagate domain errors from the repository', async () => {
    jest
      .spyOn(mockOrgsRepository, 'updateName')
      .mockRejectedValue(new OrgNotFoundError(ORG_ID));

    await expect(
      useCase.execute(new UpdateOrgCommand(ORG_ID, 'Updated Organization')),
    ).rejects.toThrow(OrgNotFoundError);
  });

  it('should wrap unexpected errors', async () => {
    jest
      .spyOn(mockOrgsRepository, 'updateName')
      .mockRejectedValue(new Error('Database error'));

    await expect(
      useCase.execute(new UpdateOrgCommand(ORG_ID, 'Updated Organization')),
    ).rejects.toThrow(UnexpectedOrgError);
  });
});
