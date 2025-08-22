import { UUID } from 'crypto';

export class GetPermittedLanguageModelQuery {
  id: UUID;

  constructor(params: { id: UUID }) {
    this.id = params.id;
  }
}
