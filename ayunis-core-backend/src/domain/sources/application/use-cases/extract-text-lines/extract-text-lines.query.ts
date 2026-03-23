import type { UUID } from 'crypto';

export class ExtractTextLinesQuery {
  constructor(
    public readonly sourceId: UUID,
    public readonly startLine: number,
    public readonly endLine: number,
  ) {}
}
