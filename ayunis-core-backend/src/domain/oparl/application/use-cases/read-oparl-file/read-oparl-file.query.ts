import type { UUID } from 'crypto';

export class ReadOparlFileQuery {
  constructor(
    readonly fileId: UUID,
    /** 1-based page of the document to start with. */
    readonly fromPage: number,
  ) {}
}
