import type { UUID } from 'crypto';

export interface PersonalCreditReservation {
  id: UUID;
  credits: number;
}

export type PersonalCreditReservationResult =
  | { status: 'unlimited' }
  | { status: 'reserved'; reservation: PersonalCreditReservation }
  | {
      status: 'insufficient';
      creditsUsed: number;
      reservedCredits: number;
      limit: number;
    };

export interface ReservePersonalCreditsParams {
  orgId: UUID;
  userId: UUID;
  requestedCredits: number;
  minimumCredits: number;
  monthStart: Date;
  now: Date;
  expiresAt: Date;
}

export abstract class PersonalCreditReservationRepository {
  abstract reserve(
    params: ReservePersonalCreditsParams,
  ): Promise<PersonalCreditReservationResult>;

  abstract release(params: {
    reservationId: UUID;
    orgId: UUID;
    userId: UUID;
  }): Promise<void>;
}
