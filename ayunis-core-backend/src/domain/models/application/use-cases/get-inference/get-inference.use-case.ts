import { Injectable, Logger } from '@nestjs/common';
import { GetInferenceCommand } from './get-inference.command';
import { InferenceHandlerRegistry } from '../../registry/inference-handler.registry';
import {
  InferenceInput,
  InferenceResponse,
} from '../../ports/inference.handler';
import { InferenceFailedError, ModelError } from '../../models.errors';

@Injectable()
export class GetInferenceUseCase {
  private readonly logger = new Logger(GetInferenceUseCase.name);

  constructor(
    private readonly inferenceHandlerRegistry: InferenceHandlerRegistry,
  ) {}

  async execute(command: GetInferenceCommand): Promise<InferenceResponse> {
    this.logger.log('triggerInference', command);

    try {
      // Get the appropriate handler for the model provider
      const inferenceHandler = this.inferenceHandlerRegistry.getHandler(
        command.model.provider,
      );

      // Execute inference
      return await inferenceHandler
        .answer(
          new InferenceInput({
            model: command.model,
            messages: command.messages,
            tools: command.tools,
            toolChoice: command.toolChoice,
          }),
        )
        .catch((error) => {
          if (error instanceof ModelError) {
            throw error;
          }
          this.logger.error('Inference failed', {
            model: command.model,
            messages: command.messages,
            tools: command.tools,
            toolChoice: command.toolChoice,
            error: error instanceof Error ? error : new Error('Unknown error'),
          });
          throw new InferenceFailedError(
            error instanceof Error
              ? error.message
              : 'Unknown error while triggering inference',
          );
        });
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error('Inference failed', {
        model: command.model,
        messages: command.messages,
        tools: command.tools,
        toolChoice: command.toolChoice,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw new InferenceFailedError(
        error instanceof Error
          ? error.message
          : 'Unknown error while triggering inference',
      );
    }
  }
}
