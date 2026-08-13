jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';
import { CreateInviteCommand } from 'src/iam/invites/application/use-cases/create-invite/create-invite.command';
import type { CreateInviteUseCase } from 'src/iam/invites/application/use-cases/create-invite/create-invite.use-case';
import { CreateInviteWithSeatReservationUseCase } from 'src/iam/invites/application/use-cases/create-invite-with-seat-reservation/create-invite-with-seat-reservation.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

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

    await new CreateInviteWithSeatReservationUseCase(
      new AcquireSeatAllocationLockUseCase(lock),
      createInvite,
    ).execute(command);

    expect(calls).toEqual(['lock', 'create']);
  });
});
