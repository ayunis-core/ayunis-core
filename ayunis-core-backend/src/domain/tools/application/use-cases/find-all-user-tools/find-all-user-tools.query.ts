import { UUID } from 'crypto';

export class FindAllUserToolsQuery {
  constructor(public readonly userId: UUID) {}
}
