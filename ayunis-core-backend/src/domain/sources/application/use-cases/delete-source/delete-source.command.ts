import { Source } from 'src/domain/sources/domain/source.entity';

export class DeleteSourceCommand {
  constructor(public readonly source: Source) {}
}
