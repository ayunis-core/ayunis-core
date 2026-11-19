import type { UUID } from 'crypto';

export class FindReleaseNoteQuery {
  constructor(public readonly id: UUID) {}
}
