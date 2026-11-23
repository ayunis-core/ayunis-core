import type { SourceRename } from 'src/domain/sources/application/ports/source-batch-write.repository';

export class RenameSourcesCommand {
  constructor(public readonly renames: SourceRename[]) {}
}
