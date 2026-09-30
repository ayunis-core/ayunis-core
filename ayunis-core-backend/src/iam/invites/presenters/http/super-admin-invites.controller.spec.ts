import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { CreateBulkInvitesUseCase } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { GetInvitesByOrgQuery } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.query';
import { GetInvitesByOrgUseCase } from 'src/iam/invites/application/use-cases/get-invites-by-org/get-invites-by-org.use-case';
import { InviteResponseMapper } from 'src/iam/invites/presenters/http/mappers/invite-response.mapper';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { SuperAdminInvitesController } from './super-admin-invites.controller';

describe(SuperAdminInvitesController.name, () => {
  it('requires the super-admin system role', () => {
    const roles = new Reflector().get<SystemRole[]>(
      SYSTEM_ROLES_KEY,
      SuperAdminInvitesController,
    );

    expect(roles).toEqual([SystemRole.SUPER_ADMIN]);
  });

  it('lists pending invites for the organization selected in the route', async () => {
    const getInvitesByOrg = { execute: jest.fn().mockResolvedValue({}) };
    const response = {
      data: [],
      pagination: { limit: 10, offset: 20, total: 0 },
    };
    const mapper = { toPaginatedDto: jest.fn().mockReturnValue(response) };
    const module = await Test.createTestingModule({
      controllers: [SuperAdminInvitesController],
      providers: [
        { provide: CreateBulkInvitesUseCase, useValue: { execute: jest.fn() } },
        { provide: GetInvitesByOrgUseCase, useValue: getInvitesByOrg },
        { provide: InviteResponseMapper, useValue: mapper },
      ],
    }).compile();
    const controller = module.get(SuperAdminInvitesController);
    const userId = '11111111-1111-4111-8111-111111111111' as UUID;
    const selectedOrgId = '22222222-2222-4222-8222-222222222222' as UUID;

    await expect(
      controller.getInvites(userId, selectedOrgId, {
        search: 'invitee@example.org',
        limit: 10,
        offset: 20,
      }),
    ).resolves.toEqual(response);

    expect(getInvitesByOrg.execute).toHaveBeenCalledWith(
      new GetInvitesByOrgQuery({
        orgId: selectedOrgId,
        requestingUserId: userId,
        onlyOpen: true,
        search: 'invitee@example.org',
        pagination: { limit: 10, offset: 20 },
      }),
    );
    expect(mapper.toPaginatedDto).toHaveBeenCalledWith({});
  });
});
