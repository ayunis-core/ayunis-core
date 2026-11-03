import type { UUID } from 'crypto';

export class CompleteThreadSourceUploadCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly uploadId: UUID,
  ) {}
}
