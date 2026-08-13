import { Injectable } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { UpdateSeatsCommand } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.command';
import { UpdateSeatsUseCase } from 'src/iam/subscriptions/application/use-cases/update-seats/update-seats.use-case';

@Injectable()
export class UpdateSeatsWithAllocationLockUseCase {
  constructor(
    private readonly acquireAllocationLock: AcquireSeatAllocationLockUseCase,
    private readonly updateSeats: UpdateSeatsUseCase,
  ) {}

  @Transactional()
  async execute(command: UpdateSeatsCommand): Promise<void> {
    await this.acquireAllocationLock.execute(command.orgId);
    await this.updateSeats.execute(command);
  }
}
