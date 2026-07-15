import type { UUID } from 'crypto';

export class GetAcademyCertificateQuery {
  public readonly userId: UUID;

  constructor(params: { userId: UUID }) {
    this.userId = params.userId;
  }
}
