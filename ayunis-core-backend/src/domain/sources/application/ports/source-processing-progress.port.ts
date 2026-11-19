import type { Source } from 'src/domain/sources/domain/source.entity';
import type { SourceProcessingProgress } from 'src/domain/sources/application/models/source-processing-progress';

export abstract class SourceProcessingProgressPort {
  abstract read(source: Source): Promise<SourceProcessingProgress>;
}
