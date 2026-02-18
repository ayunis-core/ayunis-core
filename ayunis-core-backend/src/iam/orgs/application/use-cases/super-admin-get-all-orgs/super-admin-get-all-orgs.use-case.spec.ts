import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminGetAllOrgsUseCase } from './super-admin-get-all-orgs.use-case';
import { OrgsRepository } from '../../ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Org } from '../../../domain/org.entity';
import { UUID } from 'crypto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from '../../orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

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
            findAllForSuperAdmin: jest.fn(),
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

  it('should return paginated orgs when requester is super admin', async () => {
    const orgs: Org[] = [
      new Org({ id: 'org-1' as UUID, name: 'Org 1' }),
      new Org({ id: 'org-2' as UUID, name: 'Org 2' }),
    ];
    const paginatedOrgs = new Paginated<Org>({
      data: orgs,
      limit: 50,
      offset: 0,
      total: 2,
    });

    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdmin.mockResolvedValue(paginatedOrgs);

    const query = new SuperAdminGetAllOrgsQuery({
      pagination: { limit: 50, offset: 0 },
    });
    const result = await useCase.execute(query);

    expect(contextService.get).toHaveBeenCalledWith('systemRole');
    expect(orgsRepository.findAllForSuperAdmin).toHaveBeenCalledWith(
      { limit: 50, offset: 0 },
      { search: undefined },
    );
    expect(result).toBe(paginatedOrgs);
    expect(result.data).toEqual(orgs);
    expect(result.total).toBe(2);
  });

  it('should filter orgs by search term', async () => {
    const orgs: Org[] = [new Org({ id: 'org-1' as UUID, name: 'Acme Corp' })];
    const paginatedOrgs = new Paginated<Org>({
      data: orgs,
      limit: 50,
      offset: 0,
      total: 1,
    });

    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdmin.mockResolvedValue(paginatedOrgs);

    const query = new SuperAdminGetAllOrgsQuery({ search: 'Acme' });
    const result = await useCase.execute(query);

    expect(orgsRepository.findAllForSuperAdmin).toHaveBeenCalledWith(
      { limit: 50, offset: 0 },
      { search: 'Acme' },
    );
    expect(result.data).toHaveLength(1);
  });

  it('should throw when requester is not super admin', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);
    const query = new SuperAdminGetAllOrgsQuery();

    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });

  it('should throw when requester context lacks system role', async () => {
    contextService.get.mockReturnValue(undefined);
    const query = new SuperAdminGetAllOrgsQuery();

    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });
});
