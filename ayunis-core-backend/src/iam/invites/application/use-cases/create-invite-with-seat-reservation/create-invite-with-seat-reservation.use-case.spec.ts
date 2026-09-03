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

describe(CreateInviteWithSeatReservationUseCase.name, () => {
  it('locks the organization before creating the invite', async () => {
    const calls: string[] = [];
    const lock = {
      acquire: jest.fn().mockImplementation(async () => {
        calls.push('lock');
      }),
    } as jest.Mocked<SeatAllocationLock>;
    const createInvite = {
      execute: jest.fn().mockImplementation(async () => {
        calls.push('create');
        return { invite: {}, token: 'token' };
      }),
    } as unknown as jest.Mocked<CreateInviteUseCase>;
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
    ).execute(command);

    expect(calls).toEqual(['lock', 'create']);
  });

  it('rejects a regular user before reserving a seat or creating an invite', async () => {
    const acquireAllocationLock = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AcquireSeatAllocationLockUseCase>;
    const createInvite = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateInviteUseCase>;
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
  });
});
