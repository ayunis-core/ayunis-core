import type { UUID } from 'crypto';

export class DownloadReleaseNoteImageQuery {
  constructor(public readonly releaseNoteId: UUID) {}
}
