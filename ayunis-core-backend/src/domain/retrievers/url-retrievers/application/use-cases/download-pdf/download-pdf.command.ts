import type { UUID } from 'crypto';

export class DownloadPdfCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
  ) {}
}
