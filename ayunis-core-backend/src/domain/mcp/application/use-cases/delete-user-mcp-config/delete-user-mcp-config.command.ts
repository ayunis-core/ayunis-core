import type { UUID } from 'crypto';

export class DeleteUserMcpConfigCommand {
  constructor(public readonly integrationId: UUID) {}
}
