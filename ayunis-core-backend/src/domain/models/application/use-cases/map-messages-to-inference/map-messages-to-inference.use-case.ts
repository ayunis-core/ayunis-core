import type { Message as InferenceMessage } from '@ayunis/inference';
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { createPinoLoggerConfig } from 'src/common/logger/pino-logger.config';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { stripReplayedToolNulls } from '../../helpers/strip-replayed-tool-nulls.helper';
import { toInferenceMessages } from '../../mappers/message.mapper';
import { UnexpectedModelError } from '../../models.errors';
import { MapMessagesToInferenceCommand } from './map-messages-to-inference.command';

/**
 * Converts the backend's thread messages into the provider-agnostic
 * `@ayunis/inference` messages the agent runtime consumes for `run({ messages })`.
 * Wraps the shared `toInferenceMessages` mapper so host code (the runs runtime
 * path) can assemble run inputs without reaching into the models internals.
 */
@Injectable()
export class MapMessagesToInferenceUseCase {
  constructor(
    private readonly imageContentService: ImageContentService,
    @InjectPinoLogger(MapMessagesToInferenceUseCase.name)
    private readonly logger: PinoLogger = createMapMessagesLogger(),
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: MapMessagesToInferenceCommand,
  ): Promise<InferenceMessage[]> {
    this.logger.info(
      {
        count: command.messages.length,
      },
      'Mapping thread messages to inference',
    );
    const messages = stripReplayedToolNulls(command.messages, command.tools);
    return toInferenceMessages(
      messages,
      command.orgId,
      this.imageContentService,
    );
  }
}

function createMapMessagesLogger(): PinoLogger {
  const logger = new PinoLogger(createPinoLoggerConfig());
  logger.setContext(MapMessagesToInferenceUseCase.name);
  return logger;
}
