import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SourceRepository } from 'src/domain/sources/application/ports/source.repository';
import {
  SourceNotFoundError,
  SourceReindexNotSupportedError,
  UnexpectedSourceError,
} from 'src/domain/sources/application/sources.errors';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { SetSourceReindexScheduleCommand } from './set-source-reindex-schedule.command';

/**
 * Sets, changes or clears how often a source is re-indexed automatically.
 * Performs no access check of its own; callers establish write access.
 */
@Injectable()
export class SetSourceReindexScheduleUseCase {
  private readonly logger = new Logger(SetSourceReindexScheduleUseCase.name);

  constructor(private readonly sourceRepository: SourceRepository) {}

  @HandleUnexpectedErrors(UnexpectedSourceError)
  async execute(command: SetSourceReindexScheduleCommand): Promise<UrlSource> {
    this.logger.log(
      {
        sourceId: command.sourceId,
        interval: command.interval && { ...command.interval },
      },
      'Setting source re-index schedule',
    );

    const source = await this.sourceRepository.findById(command.sourceId);
    if (!source) throw new SourceNotFoundError(command.sourceId);
    if (!(source instanceof UrlSource)) {
      throw new SourceReindexNotSupportedError(command.sourceId);
    }
    // Scheduled runs take their org from the knowledge base.
    if (command.interval && !source.knowledgeBaseId) {
      throw new SourceReindexNotSupportedError(
        command.sourceId,
        'only sources in a knowledge base are re-indexed on a schedule',
      );
    }

    source.scheduleReindex(command.interval, new Date());
    const updated = await this.sourceRepository.updateReindexSchedule(
      source.id,
      { interval: source.reindexInterval, nextReindexAt: source.nextReindexAt },
    );
    if (!updated) throw new SourceNotFoundError(command.sourceId);
    return source;
  }
}
