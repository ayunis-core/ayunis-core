import type { SplitterType } from '../../../domain/splitter-type.enum';
import type { SplitterMetadata } from '../../ports/splitter.handler';

export class SplitTextCommand {
  constructor(
    public readonly text: string,
    public readonly type: SplitterType,
    public readonly metadata?: SplitterMetadata,
  ) {}
}
