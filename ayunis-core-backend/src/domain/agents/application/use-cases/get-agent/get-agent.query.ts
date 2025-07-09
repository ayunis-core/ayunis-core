import { UUID } from 'crypto';

export class GetAgentQuery {
  id: UUID;
  userId: UUID;

  constructor(params: { id: UUID; userId: UUID }) {
    this.id = params.id;
    this.userId = params.userId;
  }
}
