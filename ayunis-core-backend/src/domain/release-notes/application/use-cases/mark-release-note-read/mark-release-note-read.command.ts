import type { UUID } from 'crypto';

export class MarkReleaseNoteReadCommand {
  constructor(public readonly id: UUID) {}
}
