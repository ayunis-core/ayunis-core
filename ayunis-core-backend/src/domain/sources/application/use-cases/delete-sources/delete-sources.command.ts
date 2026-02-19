import type { Source } from '../../../domain/source.entity';

export class DeleteSourcesCommand {
  constructor(public readonly sources: Source[]) {}
}
