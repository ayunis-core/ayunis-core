import { SplitterType } from '../../../domain/splitter-type.enum';
import { SplitterMetadata } from '../../ports/splitter.handler';

export class ProcessTextCommand {
  constructor(
    public readonly text: string,
    public readonly type: SplitterType,
    public readonly metadata?: SplitterMetadata,
  ) {}
}
