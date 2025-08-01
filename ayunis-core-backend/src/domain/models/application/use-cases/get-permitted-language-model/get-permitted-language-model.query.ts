import { UUID } from 'crypto';

export class GetPermittedLanguageModelQuery {
  id: UUID;
  orgId: UUID;

  constructor(params: { id: UUID; orgId: UUID }) {
    this.id = params.id;
    this.orgId = params.orgId;
  }
}
