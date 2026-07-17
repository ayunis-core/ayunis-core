import type { Message as InferenceMessage } from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
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
  private readonly logger = new Logger(MapMessagesToInferenceUseCase.name);

  constructor(private readonly imageContentService: ImageContentService) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: MapMessagesToInferenceCommand,
  ): Promise<InferenceMessage[]> {
    this.logger.log('Mapping thread messages to inference', {
      count: command.messages.length,
    });
    return toInferenceMessages(
      command.messages,
      command.orgId,
      this.imageContentService,
    );
  }
}
