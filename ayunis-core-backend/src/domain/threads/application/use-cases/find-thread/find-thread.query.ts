import { UUID } from 'crypto';

export class FindThreadQuery {
  constructor(
    public readonly id: UUID,
    public readonly userId: UUID,
  ) {}
}
