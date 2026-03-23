import type { UUID } from 'crypto';

export class DeleteLetterheadCommand {
  readonly letterheadId: UUID;

  constructor(params: { letterheadId: UUID }) {
    this.letterheadId = params.letterheadId;
  }
}
