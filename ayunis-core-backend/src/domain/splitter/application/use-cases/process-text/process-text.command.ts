import { SplitterProvider } from '../../../domain/splitter-provider.enum';
import { SplitterMetadata } from '../../ports/splitter.handler';

export class ProcessTextCommand {
  constructor(
    public readonly text: string,
    public readonly provider: SplitterProvider,
    public readonly metadata?: SplitterMetadata,
  ) {}
}
