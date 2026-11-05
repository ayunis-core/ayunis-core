import type { UUID } from 'crypto';

export class AbortSourceUploadCommand {
  constructor(public readonly uploadId: UUID) {}
}
