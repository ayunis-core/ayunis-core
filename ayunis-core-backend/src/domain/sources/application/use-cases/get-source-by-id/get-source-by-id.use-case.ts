import { Inject, Injectable, Logger } from '@nestjs/common';
import { Source } from '../../../domain/source.entity';
import {
  SourceRepository,
  SOURCE_REPOSITORY,
} from '../../ports/source.repository';
import { GetSourceByIdQuery } from './get-source-by-id.query';

@Injectable()
export class GetSourceByIdUseCase {
  private readonly logger = new Logger(GetSourceByIdUseCase.name);

  constructor(
    @Inject(SOURCE_REPOSITORY)
    private readonly sourceRepository: SourceRepository,
  ) {}

  async execute(query: GetSourceByIdQuery): Promise<Source | null> {
    this.logger.debug(`Getting source by ID: ${query.id}`);
    return this.sourceRepository.findById(query.id);
  }
}
