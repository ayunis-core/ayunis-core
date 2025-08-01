import { UUID } from 'crypto';

export class DeleteSourceCommand {
  constructor(public readonly id: UUID) {}
}
