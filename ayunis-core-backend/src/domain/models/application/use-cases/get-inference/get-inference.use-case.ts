import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { GetInferenceCommand } from './get-inference.command';
import { InferenceHandlerRegistry } from '../../registry/inference-handler.registry';
import {
  InferenceInput,
  InferenceResponse,
} from '../../ports/inference.handler';
import { InferenceFailedError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { extractUpstreamStatus } from '../../helpers/extract-upstream-status.helper';

@Injectable()
export class GetInferenceUseCase {
  private readonly logger = new Logger(GetInferenceUseCase.name);

  constructor(
    private readonly inferenceHandlerRegistry: InferenceHandlerRegistry,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: GetInferenceCommand): Promise<InferenceResponse> {
    this.logger.log('triggerInference', {
      model: command.model.name,
      messageCount: command.messages.length,
      toolCount: command.tools.length,
      toolChoice: command.toolChoice,
      hasInstructions: Boolean(command.instructions),
    });

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      const inferenceHandler = this.inferenceHandlerRegistry.getHandler(
        command.model.provider,
      );

      return await inferenceHandler.answer(
        new InferenceInput({
          model: command.model,
          messages: command.messages,
          systemPrompt: command.instructions,
          tools: command.tools,
          toolChoice: command.toolChoice,
          orgId,
        }),
      );
    } catch (error) {
      this.handleInferenceError(error, command);
    }
  }

  private handleInferenceError(
    error: unknown,
    command: GetInferenceCommand,
  ): never {
    if (error instanceof ApplicationError) throw error;
    const status = extractUpstreamStatus(error);
    this.logger.error('Provider inference failed', {
      model: command.model.name,
      provider: command.model.provider,
      messageCount: command.messages.length,
      toolCount: command.tools.length,
      toolChoice: command.toolChoice,
      errorName: error instanceof Error ? error.name : 'Unknown',
      status,
    });
    throw new InferenceFailedError('Provider inference failed', { status });
  }
}
