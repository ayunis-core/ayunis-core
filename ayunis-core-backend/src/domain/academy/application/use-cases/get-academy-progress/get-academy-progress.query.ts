import type { UUID } from 'crypto';

export class GetAcademyProgressQuery {
  public readonly userId: UUID;

  constructor(params: { userId: UUID }) {
    this.userId = params.userId;
  }
}
