import type { UUID } from 'crypto';

export class ExtractTextLinesQuery {
  public readonly sourceId: UUID;
  public readonly startLine: number;
  public readonly endLine: number;

  constructor(params: { sourceId: UUID; startLine: number; endLine: number }) {
    this.sourceId = params.sourceId;
    this.startLine = params.startLine;
    this.endLine = params.endLine;
  }
}
