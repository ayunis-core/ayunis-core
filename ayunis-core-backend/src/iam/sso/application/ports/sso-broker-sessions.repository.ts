import type { UUID } from 'crypto';

export interface SsoBrokerSession {
  userId: UUID;
  zitadelSessionId: string;
  encryptedIdToken: string;
  expiresAt: Date;
}

export abstract class SsoBrokerSessionsRepository {
  abstract upsert(session: SsoBrokerSession): Promise<void>;

  abstract findActiveByZitadelSessionId(
    zitadelSessionId: string,
    now: Date,
  ): Promise<SsoBrokerSession | null>;

  abstract deleteExpired(now: Date): Promise<number>;
}
