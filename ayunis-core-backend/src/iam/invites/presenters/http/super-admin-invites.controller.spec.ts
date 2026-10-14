import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { SYSTEM_ROLES_KEY } from 'src/iam/authorization/application/decorators/system-roles.decorator';
import { CreateBulkInvitesUseCase } from 'src/iam/invites/application/use-cases/create-bulk-invites/create-bulk-invites.use-case';
import { DeleteInviteUseCase } from 'src/iam/invites/application/use-cases/delete-invite/delete-invite.use-case';
import { DeleteInviteCommand } from 'src/iam/invites/application/use-cases/delete-invite/delete-invite.command';
import { DeleteAllPendingInvitesUseCase } from 'src/iam/invites/application/use-cases/delete-all-pending-invites/delete-all-pending-invites.use-case';
import { DeleteAllPendingInvitesCommand } from 'src/iam/invites/application/use-cases/delete-all-pending-invites/delete-all-pending-invites.command';
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
        { provide: DeleteInviteUseCase, useValue: { execute: jest.fn() } },
        {
          provide: DeleteAllPendingInvitesUseCase,
          useValue: { execute: jest.fn() },
        },
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

describe('Super admin invite deletion', () => {
  const orgId = '22222222-2222-4222-8222-222222222222' as UUID;
  const inviteId = '33333333-3333-4333-8333-333333333333' as UUID;
  const deleteInvite = { execute: jest.fn().mockResolvedValue(undefined) };
  const deleteAll = {
    execute: jest.fn().mockResolvedValue({ deletedCount: 3 }),
  };

  async function controller() {
    const module = await Test.createTestingModule({
      controllers: [SuperAdminInvitesController],
      providers: [
        { provide: CreateBulkInvitesUseCase, useValue: {} },
        { provide: GetInvitesByOrgUseCase, useValue: {} },
        { provide: InviteResponseMapper, useValue: {} },
        { provide: DeleteInviteUseCase, useValue: deleteInvite },
        { provide: DeleteAllPendingInvitesUseCase, useValue: deleteAll },
      ],
    }).compile();
    return module.get(SuperAdminInvitesController);
  }

  it('scopes single deletion to the selected organization', async () => {
    await (await controller()).deleteInvite(orgId, inviteId);
    expect(deleteInvite.execute).toHaveBeenCalledWith(
      new DeleteInviteCommand({ orgId, inviteId }),
    );
  });

  it('returns the count deleted from the selected organization', async () => {
    await expect((await controller()).deleteAllPending(orgId)).resolves.toEqual(
      {
        deletedCount: 3,
      },
    );
    expect(deleteAll.execute).toHaveBeenCalledWith(
      new DeleteAllPendingInvitesCommand(orgId),
    );
  });
});
