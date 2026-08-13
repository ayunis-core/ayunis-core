import type { UUID } from 'crypto';

export abstract class SeatAllocationLock {
  abstract acquire(orgId: UUID): Promise<void>;
}
