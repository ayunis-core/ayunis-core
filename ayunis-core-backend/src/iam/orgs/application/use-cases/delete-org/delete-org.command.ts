import { UUID } from 'crypto';

export class DeleteOrgCommand {
  constructor(public readonly id: UUID) {}
}
