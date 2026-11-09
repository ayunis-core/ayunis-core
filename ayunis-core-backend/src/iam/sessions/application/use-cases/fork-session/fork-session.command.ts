import type { RefreshToken } from 'src/iam/sessions/domain/refresh-token.entity';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export class ForkSessionCommand {
  constructor(
    public readonly current: RefreshToken,
    public readonly client: SessionClient,
  ) {}
}
