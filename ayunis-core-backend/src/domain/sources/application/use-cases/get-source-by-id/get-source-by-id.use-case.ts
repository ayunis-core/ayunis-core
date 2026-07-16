import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourceByIdQuery } from './get-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class GetSourceByIdUseCase {
  private readonly logger = new Logger(GetSourceByIdUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: GetSourceByIdQuery): Promise<Source> {
    this.logger.log('execute', { id: query.sourceId });
    const source = await this.sourceRepository.findById(query.sourceId);
    if (!source) {
      throw new SourceNotFoundError(query.sourceId);
    }
    return source;
  }
}
