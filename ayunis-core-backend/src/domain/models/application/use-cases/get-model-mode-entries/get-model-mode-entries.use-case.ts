import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { GetModelModeEntriesQuery } from './get-model-mode-entries.query';

@Injectable()
export class GetModelModeEntriesUseCase {
  private readonly logger = new Logger(GetModelModeEntriesUseCase.name);

  constructor(
    private readonly modelModeEntriesRepository: ModelModeEntriesRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(query: GetModelModeEntriesQuery): Promise<ModelModeEntry[]> {
    this.logger.log({ mode: query.mode }, 'Getting model mode entries');
    return this.modelModeEntriesRepository.findByMode(query.mode);
  }
}
