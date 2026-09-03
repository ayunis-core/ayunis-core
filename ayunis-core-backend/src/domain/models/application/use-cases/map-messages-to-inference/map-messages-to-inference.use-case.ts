import type { Message as InferenceMessage } from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { stripReplayedToolNulls } from 'src/domain/models/application/helpers/strip-replayed-tool-nulls.helper';
import { toInferenceMessages } from 'src/domain/models/application/mappers/message.mapper';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { MapMessagesToInferenceCommand } from './map-messages-to-inference.command';

/**
 * Converts the backend's thread messages into the provider-agnostic
 * `@ayunis/inference` messages the agent runtime consumes for `run({ messages })`.
 * Wraps the shared `toInferenceMessages` mapper so host code (the runs runtime
 * path) can assemble run inputs without reaching into the models internals.
 */
@Injectable()
export class MapMessagesToInferenceUseCase {
  private readonly logger = new Logger(MapMessagesToInferenceUseCase.name);

  constructor(private readonly imageContentService: ImageContentService) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: MapMessagesToInferenceCommand,
  ): Promise<InferenceMessage[]> {
    this.logger.log(
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
