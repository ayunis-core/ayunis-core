import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetSourcesByIdsQuery } from './get-sources-by-ids.query';
import { UnexpectedSourceError } from '../../sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class GetSourcesByIdsUseCase {
  private readonly logger = new Logger(GetSourcesByIdsUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: GetSourcesByIdsQuery): Promise<Source[]> {
    this.logger.log('execute', { count: query.sourceIds.length });
    if (query.sourceIds.length === 0) {
      return [];
    }
    return await this.sourceRepository.findByIds(query.sourceIds);
  }
}
