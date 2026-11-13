import { Injectable } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedSourceError } from 'src/domain/sources/application/sources.errors';
import { SourceProcessingProgressPort } from 'src/domain/sources/application/ports/source-processing-progress.port';
import type { SourceProcessingProgress } from 'src/domain/sources/application/models/source-processing-progress';
import type { Source } from 'src/domain/sources/domain/source.entity';

@Injectable()
export class GetSourceProcessingProgressUseCase {
  constructor(private readonly progress: SourceProcessingProgressPort) {}

  // The calling module supplies sources after authorizing access to their owning resource.
  @HandleUnexpectedErrors(UnexpectedSourceError)
  execute(sources: Source[]): Promise<SourceProcessingProgress[]> {
    return Promise.all(sources.map((source) => this.progress.read(source)));
  }
}
