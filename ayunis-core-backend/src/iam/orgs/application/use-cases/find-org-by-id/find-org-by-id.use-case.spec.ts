import { Test, TestingModule } from '@nestjs/testing';
import { FindOrgByIdUseCase } from './find-org-by-id.use-case';
import { FindOrgByIdQuery } from './find-org-by-id.query';
import { OrgsRepository } from '../../ports/orgs.repository';
import { Org } from '../../../domain/org.entity';
import { OrgNotFoundError } from '../../orgs.errors';
import { UUID } from 'crypto';

describe('FindOrgByIdUseCase', () => {
  let useCase: FindOrgByIdUseCase;
  let mockOrgsRepository: Partial<OrgsRepository>;

  beforeEach(async () => {
    mockOrgsRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindOrgByIdUseCase,
        { provide: OrgsRepository, useValue: mockOrgsRepository },
      ],
    }).compile();

    useCase = module.get<FindOrgByIdUseCase>(FindOrgByIdUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should find organization by ID successfully', async () => {
    const query = new FindOrgByIdQuery('org-id' as UUID);
    const mockOrg = new Org({
      id: 'org-id' as UUID,
      name: 'Test Organization',
    });

    jest.spyOn(mockOrgsRepository, 'findById').mockResolvedValue(mockOrg);

    const result = await useCase.execute(query);

    expect(result).toBe(mockOrg);
    expect(mockOrgsRepository.findById).toHaveBeenCalledWith('org-id');
  });

  it('should throw OrgNotFoundError when organization not found', async () => {
    const query = new FindOrgByIdQuery('org-id' as UUID);

    jest
      .spyOn(mockOrgsRepository, 'findById')
      .mockRejectedValue(new OrgNotFoundError('org-id' as UUID));

    await expect(useCase.execute(query)).rejects.toThrow(OrgNotFoundError);
  });

  it('should throw OrgNotFoundError for unexpected errors', async () => {
    const query = new FindOrgByIdQuery('org-id' as UUID);

    jest
      .spyOn(mockOrgsRepository, 'findById')
      .mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(query)).rejects.toThrow(OrgNotFoundError);
  });
});
