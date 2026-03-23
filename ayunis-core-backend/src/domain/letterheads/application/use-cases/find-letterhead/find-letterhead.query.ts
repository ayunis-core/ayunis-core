import type { UUID } from 'crypto';

export class FindLetterheadQuery {
  readonly letterheadId: UUID;

  constructor(params: { letterheadId: UUID }) {
    this.letterheadId = params.letterheadId;
  }
}
