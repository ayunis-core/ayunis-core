import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import {
  OrgNotFoundError,
  OrgUnauthorizedError,
} from 'src/iam/orgs/application/orgs.errors';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { Org } from 'src/iam/orgs/domain/org.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SuperAdminGetOrgQuery } from './super-admin-get-org.query';
import { SuperAdminGetOrgUseCase } from './super-admin-get-org.use-case';

const ORG_ID = '33333333-3333-4333-8333-333333333333' as UUID;

describe('SuperAdminGetOrgUseCase', () => {
  let useCase: SuperAdminGetOrgUseCase;
  let orgsRepository: jest.Mocked<
    Pick<OrgsRepository, 'findById' | 'findLifecycleStatuses'>
  >;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

  beforeEach(async () => {
    orgsRepository = {
      findById: jest.fn(),
      findLifecycleStatuses: jest.fn(),
    };
    contextService = { get: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminGetOrgUseCase,
        { provide: OrgsRepository, useValue: orgsRepository },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();
    useCase = module.get(SuperAdminGetOrgUseCase);
  });

  it('returns the organization with its derived lifecycle status', async () => {
    const org = new Org({ id: ORG_ID, name: 'Gemeinde Musterstadt' });
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findById.mockResolvedValue(org);
    orgsRepository.findLifecycleStatuses.mockResolvedValue(
      new Map([[ORG_ID, 'expired']]),
    );

    const result = await useCase.execute(new SuperAdminGetOrgQuery(ORG_ID));

    expect(result).toEqual({ org, lifecycleStatus: 'expired' });
    expect(orgsRepository.findLifecycleStatuses).toHaveBeenCalledWith([ORG_ID]);
  });

  it('rejects a requester who is not a super admin', async () => {
    contextService.get.mockReturnValue(SystemRole.CUSTOMER);

    await expect(
      useCase.execute(new SuperAdminGetOrgQuery(ORG_ID)),
    ).rejects.toThrow(OrgUnauthorizedError);
    expect(orgsRepository.findById).not.toHaveBeenCalled();
  });

  it('keeps reporting a missing organization as not found', async () => {
    contextService.get.mockReturnValue(SystemRole.SUPER_ADMIN);
    orgsRepository.findById.mockRejectedValue(new OrgNotFoundError(ORG_ID));

    await expect(
      useCase.execute(new SuperAdminGetOrgQuery(ORG_ID)),
    ).rejects.toThrow(OrgNotFoundError);
  });
});
