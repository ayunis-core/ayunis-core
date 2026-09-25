jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';
import { CreateInviteCommand } from 'src/iam/invites/application/use-cases/create-invite/create-invite.command';
import { CreateInviteUseCase } from 'src/iam/invites/application/use-cases/create-invite/create-invite.use-case';
import { CreateInviteWithSeatReservationUseCase } from 'src/iam/invites/application/use-cases/create-invite-with-seat-reservation/create-invite-with-seat-reservation.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedInviteAccessError } from 'src/iam/invites/application/invites.errors';
import { Invite } from 'src/iam/invites/domain/invite.entity';
import { InviteCreatedEventPublisher } from 'src/iam/invites/application/services/invite-created-event-publisher.service';

describe(CreateInviteWithSeatReservationUseCase.name, () => {
  it('locks the organization before creating the invite', async () => {
    const calls: string[] = [];
    const lock = {
      acquire: jest.fn().mockImplementation(async () => {
        calls.push('lock');
      }),
    } as jest.Mocked<SeatAllocationLock>;
    const invite = new Invite({
      email: 'user@example.de',
      orgId: randomUUID(),
      role: UserRole.USER,
      expiresAt: new Date('2026-10-02T12:00:00.000Z'),
    });
    const createInvite = {
      execute: jest.fn().mockImplementation(async () => {
        calls.push('create');
        return { invite, token: 'token' };
      }),
    } as unknown as jest.Mocked<CreateInviteUseCase>;
    const publishInviteCreated = {
      publish: jest.fn().mockImplementation(() => calls.push('publish')),
    } as unknown as jest.Mocked<InviteCreatedEventPublisher>;
    const command = new CreateInviteCommand({
      email: 'user@example.de',
      orgId: randomUUID(),
      role: UserRole.USER,
      userId: randomUUID(),
    });
    const contextService = {
      get: jest.fn((key: string) => {
        if (key === 'role') return UserRole.ADMIN;
        if (key === 'orgId') return command.orgId;
        return undefined;
      }),
    } as unknown as ContextService;

    await new CreateInviteWithSeatReservationUseCase(
      new AcquireSeatAllocationLockUseCase(lock),
      createInvite,
      contextService,
      publishInviteCreated,
    ).execute(command);

    expect(calls).toEqual(['lock', 'create', 'publish']);
    expect(publishInviteCreated.publish).toHaveBeenCalledWith(invite);
  });

  it('rejects a regular user before reserving a seat or creating an invite', async () => {
    const acquireAllocationLock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AcquireSeatAllocationLockUseCase>;
    const createInvite = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateInviteUseCase>;
    const publishInviteCreated = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<InviteCreatedEventPublisher>;
    const contextService = {
      get: jest.fn((key: string) =>
        key === 'role' ? UserRole.USER : undefined,
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        CreateInviteWithSeatReservationUseCase,
        {
          provide: AcquireSeatAllocationLockUseCase,
          useValue: acquireAllocationLock,
        },
        { provide: CreateInviteUseCase, useValue: createInvite },
        { provide: ContextService, useValue: contextService },
        {
          provide: InviteCreatedEventPublisher,
          useValue: publishInviteCreated,
        },
      ],
    }).compile();
    const command = new CreateInviteCommand({
      email: 'recipient@gemeinde-musterstadt.de',
      orgId: randomUUID(),
      role: UserRole.ADMIN,
      userId: randomUUID(),
    });

    await expect(
      module.get(CreateInviteWithSeatReservationUseCase).execute(command),
    ).rejects.toThrow(UnauthorizedInviteAccessError);
    expect(acquireAllocationLock.execute).not.toHaveBeenCalled();
    expect(createInvite.execute).not.toHaveBeenCalled();
    expect(publishInviteCreated.publish).not.toHaveBeenCalled();
  });
});
