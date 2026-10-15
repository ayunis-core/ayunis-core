import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SuperAdminGetAllOrgsUseCase } from './super-admin-get-all-orgs.use-case';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Org } from 'src/iam/orgs/domain/org.entity';
import type { UUID } from 'crypto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from 'src/iam/orgs/application/orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination/paginated.entity';

describe('SuperAdminGetAllOrgsUseCase', () => {
  let useCase: SuperAdminGetAllOrgsUseCase;
  let orgsRepository: jest.Mocked<OrgsRepository>;
  let contextService: jest.Mocked<ContextService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminGetAllOrgsUseCase,
        {
          provide: OrgsRepository,
          useValue: {
            findAllForSuperAdmin: jest.fn(),
            findLifecycleStatuses: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    orgsRepository.findLifecycleStatuses.mockResolvedValue(new Map());
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
    expect(result.data.map((item) => item.org)).toEqual(orgs);
    expect(result.total).toBe(2);
    expect(result.limit).toBe(50);
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

  it("reports each listed org's lifecycle status", async () => {
    const orgs = [
      new Org({ id: 'org-paying' as UUID, name: 'Gemeinde Musterstadt' }),
      new Org({ id: 'org-expired' as UUID, name: 'Gemeinde Beispielhausen' }),
    ];
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdmin.mockResolvedValue(
      new Paginated<Org>({ data: orgs, limit: 50, offset: 0, total: 2 }),
    );
    orgsRepository.findLifecycleStatuses.mockResolvedValue(
      new Map([
        ['org-paying' as UUID, 'paying'],
        ['org-expired' as UUID, 'expired'],
      ]),
    );

    const result = await useCase.execute(new SuperAdminGetAllOrgsQuery());

    expect(orgsRepository.findLifecycleStatuses).toHaveBeenCalledWith([
      'org-paying',
      'org-expired',
    ]);
    expect(
      result.data.map((item) => [item.org.name, item.lifecycleStatus]),
    ).toEqual([
      ['Gemeinde Musterstadt', 'paying'],
      ['Gemeinde Beispielhausen', 'expired'],
    ]);
  });

  it('passes the lifecycle filter through to the repository', async () => {
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdmin.mockResolvedValue(
      new Paginated<Org>({ data: [], limit: 50, offset: 0, total: 0 }),
    );

    await useCase.execute(
      new SuperAdminGetAllOrgsQuery({ lifecycle: 'expired' }),
    );

    expect(orgsRepository.findAllForSuperAdmin).toHaveBeenCalledWith(
      { limit: 50, offset: 0 },
      { lifecycle: 'expired' },
    );
  });

  it('should throw when requester is not super admin', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);
    const query = new SuperAdminGetAllOrgsQuery();

    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });

  it('rejects an api key even when systemRole is super admin', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return '22222222-2222-4222-8222-222222222222';
      if (key === 'apiKeyId') return '44444444-4444-4444-8444-444444444444';
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      return undefined;
    });

    await expect(
      useCase.execute(new SuperAdminGetAllOrgsQuery()),
    ).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });

  it('should throw when requester context lacks system role', async () => {
    contextService.get.mockReturnValue(undefined);
    const query = new SuperAdminGetAllOrgsQuery();

    await expect(useCase.execute(query)).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });
});
