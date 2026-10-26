import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import {
  ModelNotFoundByIdError,
  NotALanguageModelError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ModelTierNotAllowedForModeError } from 'src/domain/models/application/model-modes.errors';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { ReplaceModelModeEntriesCommand } from './replace-model-mode-entries.command';

@Injectable()
export class ReplaceModelModeEntriesUseCase {
  private readonly logger = new Logger(ReplaceModelModeEntriesUseCase.name);

  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelModeEntriesRepository: ModelModeEntriesRepository,
  ) {}

  @Transactional()
  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(command: ReplaceModelModeEntriesCommand): Promise<void> {
    this.logger.log(
      { mode: command.mode, entryCount: command.entries.length },
      'Replacing model mode entries',
    );

    const catalog = new Map(
      (await this.modelsRepository.findAll()).map((m) => [m.id, m]),
    );

    const entries = command.entries.map(({ modelId, enabled }, position) => {
      const model = catalog.get(modelId);
      if (!model) throw new ModelNotFoundByIdError(modelId);
      if (!(model instanceof LanguageModel)) {
        throw new NotALanguageModelError(modelId);
      }
      if (command.mode === ModelMode.MAX && model.tier !== ModelTier.HIGH) {
        throw new ModelTierNotAllowedForModeError(modelId, command.mode);
      }
      return new ModelModeEntry({
        mode: command.mode,
        model,
        position,
        enabled,
      });
    });

    await this.modelModeEntriesRepository.replaceForMode(command.mode, entries);
  }
}
