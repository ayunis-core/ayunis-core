import { Inject, Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { GetSourcesByThreadIdQuery } from './get-sources-by-thread-id.query';

@Injectable()
export class GetSourcesByThreadIdUseCase {
  private readonly logger = new Logger(GetSourcesByThreadIdUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourcesByThreadIdQuery): Promise<Source[]> {
    this.logger.debug(`Getting sources by thread ID: ${query.threadId}`);
    return this.sourceRepository.findAllByThreadId(query.threadId);
  }
}
