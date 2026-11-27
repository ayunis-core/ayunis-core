import type { UUID } from 'crypto';

export class GetPdfVersionCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
  ) {}
}
