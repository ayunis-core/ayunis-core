import { Inject, Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { GetSourcesByUserIdQuery } from './get-sources-by-user-id.query';

@Injectable()
export class GetSourcesByUserIdUseCase {
  private readonly logger = new Logger(GetSourcesByUserIdUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourcesByUserIdQuery): Promise<Source[]> {
    this.logger.debug(`Getting sources by user ID: ${query.userId}`);
    return this.sourceRepository.findAllByUserId(query.userId);
  }
}
