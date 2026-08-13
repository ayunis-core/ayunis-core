jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import { randomUUID } from 'crypto';
import type { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import type { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';
import { UpdateSeatsWithAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats-with-allocation-lock/update-seats-with-allocation-lock.use-case';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';

describe(UpdateSeatsWithAllocationLockUseCase.name, () => {
  it('locks the organization before updating seat capacity', async () => {
    const calls: string[] = [];
    const lock = {
      acquire: jest.fn().mockImplementation(async () => {
        calls.push('lock');
      }),
    } as jest.Mocked<SeatAllocationLock>;
    const updateSeats = {
      execute: jest.fn().mockImplementation(async () => {
        calls.push('update');
      }),
    } as unknown as jest.Mocked<UpdateSeatsUseCase>;
    const command = new UpdateSeatsCommand({
      orgId: randomUUID(),
      requestingUserId: randomUUID(),
      noOfSeats: 5,
    });

    await new UpdateSeatsWithAllocationLockUseCase(
      new AcquireSeatAllocationLockUseCase(lock),
      updateSeats,
    ).execute(command);

    expect(calls).toEqual(['lock', 'update']);
  });
});
