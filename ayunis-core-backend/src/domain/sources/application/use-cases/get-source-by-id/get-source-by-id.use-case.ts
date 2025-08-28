import { Inject, Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { GetSourceByIdQuery } from './get-source-by-id.query';
import { SourceNotFoundError } from '../../sources.errors';
import { UnexpectedSourceError } from '../../sources.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetSourceByIdUseCase {
  private readonly logger = new Logger(GetSourceByIdUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourceByIdQuery): Promise<Source> {
    this.logger.debug(`Getting source by ID: ${query.id}`);
    try {
      const source = await this.sourceRepository.findById(query.id);
      if (!source) {
        throw new SourceNotFoundError(query.id);
      }
      return source;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedSourceError(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
