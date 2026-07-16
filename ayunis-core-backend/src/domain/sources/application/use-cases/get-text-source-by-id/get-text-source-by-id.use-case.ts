import { Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import { SourceRepository } from '../../ports/source.repository';
import { GetTextSourceByIdQuery } from './get-text-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';

@Injectable()
export class GetTextSourceByIdUseCase {
  private readonly logger = new Logger(GetTextSourceByIdUseCase.name);

  constructor(private readonly textSourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(query: GetTextSourceByIdQuery): Promise<Source> {
    this.logger.log('execute', { id: query.id });
    const source = await this.textSourceRepository.findById(query.id);
    if (!source) {
      throw new SourceNotFoundError(query.id);
    }
    return source;
  }
}
