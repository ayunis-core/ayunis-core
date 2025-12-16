import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminGetAllOrgsUseCase } from './super-admin-get-all-orgs.use-case';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { OrgsRepository } from '../../ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Org } from '../../../domain/org.entity';
import { UUID } from 'crypto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from '../../orgs.errors';
import { Paginated } from 'src/common/pagination';

describe('SuperAdminGetAllOrgsUseCase', () => {
  let useCase: SuperAdminGetAllOrgsUseCase;
  let orgsRepository: jest.Mocked<OrgsRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminGetAllOrgsUseCase,
        {
          provide: OrgsRepository,
          useValue: {
            findAllForSuperAdminPaginated: jest.fn(),
          } satisfies Partial<OrgsRepository>,
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          } satisfies Partial<ContextService>,
        },
      ],
    }).compile();

    useCase = module.get(SuperAdminGetAllOrgsUseCase);
    orgsRepository = module.get(OrgsRepository);
    contextService = module.get(ContextService);
  });

  it('should return all orgs when requester is super admin', async () => {
    const orgs: Org[] = [
      new Org({ id: 'org-1' as UUID, name: 'Org 1' }),
      new Org({ id: 'org-2' as UUID, name: 'Org 2' }),
    ];

    const paginatedOrgs = new Paginated({
      data: orgs,
      limit: 25,
      offset: 0,
      total: 2,
    });

    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdminPaginated.mockResolvedValue(
      paginatedOrgs,
    );

    const query = new SuperAdminGetAllOrgsQuery();
    const result = await useCase.execute(query);

    expect(contextService.get).toHaveBeenCalledWith('systemRole');
    expect(orgsRepository.findAllForSuperAdminPaginated).toHaveBeenCalled();
    expect(result.data).toEqual(orgs);
    expect(result.total).toBe(2);
  });

  it('should throw when requester is not super admin', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);

    const query = new SuperAdminGetAllOrgsQuery();
    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdminPaginated).not.toHaveBeenCalled();
  });

  it('should throw when requester context lacks system role', async () => {
    contextService.get.mockReturnValue(undefined);

    const query = new SuperAdminGetAllOrgsQuery();
    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdminPaginated).not.toHaveBeenCalled();
  });
});
