import type { UUID } from 'crypto';

export class ReleasePersonalCreditReservationCommand {
  constructor(public readonly reservationId: UUID) {}
}
