import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';

@Injectable()
export class AcquireSeatAllocationLockUseCase {
  constructor(private readonly allocationLock: SeatAllocationLock) {}

  async execute(orgId: UUID): Promise<void> {
    await this.allocationLock.acquire(orgId);
  }
}
