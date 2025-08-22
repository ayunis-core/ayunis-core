import { UUID } from 'crypto';

export class GetAgentQuery {
  id: UUID;

  constructor(params: { id: UUID }) {
    this.id = params.id;
  }
}
