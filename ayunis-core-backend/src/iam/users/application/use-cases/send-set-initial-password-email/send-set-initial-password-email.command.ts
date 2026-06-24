import type { UUID } from 'crypto';

export class SendSetInitialPasswordEmailCommand {
  constructor(
    public readonly userEmail: string,
    public readonly userName: string,
    public readonly resetToken: string,
    public readonly orgId: UUID,
  ) {}
}
