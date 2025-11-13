import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminGetAllOrgsUseCase } from './super-admin-get-all-orgs.use-case';
import { OrgsRepository } from '../../ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Org } from '../../../domain/org.entity';
import { UUID } from 'crypto';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { OrgUnauthorizedError } from '../../orgs.errors';

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

  it('should return all orgs when requester is super admin', async () => {
    const orgs: Org[] = [
      new Org({ id: 'org-1' as UUID, name: 'Org 1' }),
      new Org({ id: 'org-2' as UUID, name: 'Org 2' }),
    ];

    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findAllForSuperAdmin.mockResolvedValue(orgs);

    const result = await useCase.execute();

    expect(contextService.get).toHaveBeenCalledWith('systemRole');
    expect(orgsRepository.findAllForSuperAdmin).toHaveBeenCalled();
    expect(result).toBe(orgs);
  });

  it('should throw when requester is not super admin', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);

    await expect(useCase.execute()).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });

  it('should throw when requester context lacks system role', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findAllForSuperAdmin).not.toHaveBeenCalled();
  });
});
