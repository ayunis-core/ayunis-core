import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export class HandOffSessionCommand {
  constructor(
    public readonly refreshToken: string,
    public readonly client: SessionClient,
  ) {}
}
