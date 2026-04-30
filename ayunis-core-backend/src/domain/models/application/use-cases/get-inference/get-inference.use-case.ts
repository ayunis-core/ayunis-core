import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetInferenceCommand } from './get-inference.command';
import { InferenceHandlerRegistry } from '../../registry/inference-handler.registry';
import {
  InferenceInput,
  InferenceResponse,
} from '../../ports/inference.handler';
import { InferenceFailedError, ModelError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class GetInferenceUseCase {
  private readonly logger = new Logger(GetInferenceUseCase.name);

  constructor(
    private readonly inferenceHandlerRegistry: InferenceHandlerRegistry,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: GetInferenceCommand): Promise<InferenceResponse> {
    this.logger.log('triggerInference', command);

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      const inferenceHandler = this.inferenceHandlerRegistry.getHandler(
        command.model.provider,
      );
      return await inferenceHandler
        .answer(this.toInferenceInput(command, orgId))
        .catch((error) => {
          this.wrapHandlerError(error, command);
        });
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.wrapHandlerError(error, command);
    }
  }

  private toInferenceInput(
    command: GetInferenceCommand,
    orgId: string,
  ): InferenceInput {
    return new InferenceInput({
      model: command.model,
      messages: command.messages,
      systemPrompt: command.instructions,
      tools: command.tools,
      toolChoice: command.toolChoice,
      orgId,
    });
  }

  private wrapHandlerError(
    error: unknown,
    command: GetInferenceCommand,
  ): never {
    if (error instanceof ModelError) throw error;
    this.logger.error('Inference failed', {
      model: command.model,
      // Conversation contents may carry user-provided PII; this logger sink
      // reaches Sentry on the InferenceFailedError 500 path. Drop the bytes,
      // keep the structure.
      messages: command.messages.map((m) => ({
        role: m.role,
        contentParts: m.content.length,
      })),
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
