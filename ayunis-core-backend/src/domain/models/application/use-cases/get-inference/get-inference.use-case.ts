import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetInferenceCommand } from './get-inference.command';
import { InferenceHandlerRegistry } from '../../registry/inference-handler.registry';
import {
  InferenceInput,
  InferenceResponse,
} from '../../ports/inference.handler';
import {
  InferenceFailedError,
  InferenceTokenLimitError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { stripReplayedToolNulls } from '../../helpers/strip-replayed-tool-nulls.helper';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';

@Injectable()
export class GetInferenceUseCase {
  constructor(
    @InjectPinoLogger(GetInferenceUseCase.name)
    private readonly logger: PinoLogger,

    private readonly inferenceHandlerRegistry: InferenceHandlerRegistry,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: GetInferenceCommand): Promise<InferenceResponse> {
    this.logger.info(
      {
        model: command.model.name,
        messageCount: command.messages.length,
        toolCount: command.tools.length,
        toolChoice: command.toolChoice,
        hasInstructions: Boolean(command.instructions),
      },
      'triggerInference',
    );

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('Organization context required');
    }

    try {
      const inferenceHandler = this.inferenceHandlerRegistry.getHandler(
        command.model.provider,
      );

      const response = await inferenceHandler.answer(
        new InferenceInput({
          model: command.model,
          messages: stripReplayedToolNulls(command.messages, command.tools),
          systemPrompt: command.instructions,
          tools: command.tools,
          toolChoice: command.toolChoice,
          orgId,
        }),
      );
      this.assertTokenLimitResponseAllowed(
        response,
        command.acceptTokenLimitCompletion,
      );
      return response;
    } catch (error) {
      this.handleInferenceError(error, command);
    }
  }

  private assertTokenLimitResponseAllowed(
    response: InferenceResponse,
    acceptTokenLimitCompletion: boolean,
  ): void {
    if (response.finishReason !== 'length') return;
    const toolCalls = response.content.filter(
      (content) => content instanceof ToolUseMessageContent,
    );
    if (toolCalls.length > 0) {
      throw new InferenceTokenLimitError({
        toolNames: toolCalls.map((toolCall) => toolCall.name),
      });
    }
    if (acceptTokenLimitCompletion) return;
    throw new InferenceFailedError(
      'Model response was truncated (reached the maximum token limit)',
    );
  }

  private handleInferenceError(
    error: unknown,
    command: GetInferenceCommand,
  ): never {
    if (error instanceof ApplicationError) throw error;
    const providerError = wrapProviderFailure(error, {
      provider: command.model.provider,
      modelId: command.model.name,
    });
    if (providerError) {
      this.logger.error(
        {
          code: providerError.code,
          ...providerError.context,
        },
        'Provider unavailable during inference',
      );
      throw providerError;
    }
    const status = extractUpstreamStatus(error);
    this.logger.error(
      {
        model: command.model.name,
        provider: command.model.provider,
        messageCount: command.messages.length,
        toolCount: command.tools.length,
        toolChoice: command.toolChoice,
        errorName: error instanceof Error ? error.name : 'Unknown',
        status,
      },
      'Provider inference failed',
    );
    throw new InferenceFailedError('Provider inference failed', { status });
  }
}
