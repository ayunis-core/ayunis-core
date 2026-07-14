import { Observable, catchError, throwError } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { stripReplayedToolNulls } from '../../helpers/strip-replayed-tool-nulls.helper';

@Injectable()
export class StreamInferenceUseCase {
  private readonly logger = new Logger(StreamInferenceUseCase.name);
  constructor(
    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {}

  execute(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    try {
      return this.getHandler(input.model)
        .answer(this.sanitizeReplayedMessages(input))
        .pipe(
          catchError((error: unknown) =>
            throwError(() => this.handleInferenceError(error, input)),
          ),
        );
    } catch (error) {
      throw this.handleInferenceError(error, input);
    }
  }

  private handleInferenceError(
    error: unknown,
    input: StreamInferenceInput,
  ): Error {
    if (error instanceof ApplicationError) return error;
    if (isAbortError(error)) {
      this.logger.log('Streaming inference aborted by client', {
        model: input.model.name,
        provider: input.model.provider,
      });
      return new InferenceAbortedError();
    }
    const providerError = wrapProviderFailure(error, {
      provider: input.model.provider,
      modelId: input.model.name,
    });
    if (providerError) {
      this.logger.error('Provider unavailable during stream inference', {
        code: providerError.code,
        ...providerError.context,
      });
      return providerError;
    }
    const status = extractUpstreamStatus(error);
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error('Provider stream inference failed', {
      model: input.model.name,
      provider: input.model.provider,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
      errorName: error instanceof Error ? error.name : 'Unknown',
      status,
    });
    // Anthropic/Bedrock reject oversized images with "image exceeds N MB
    // maximum" — surface a distinct code so the UI can tell the user to shrink
    // it instead of showing a generic failure.
    if (/image exceeds .* maximum/i.test(message)) {
      return new InferenceImageTooLargeError({ status });
    }
    return new InferenceFailedError('Provider inference failed', { status });
  }

  private sanitizeReplayedMessages(
    input: StreamInferenceInput,
  ): StreamInferenceInput {
    const messages = stripReplayedToolNulls(input.messages, input.tools);
    if (messages === input.messages) {
      return input;
    }
    return new StreamInferenceInput({
      model: input.model,
      messages,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      toolChoice: input.toolChoice,
      orgId: input.orgId,
    });
  }

  private getHandler(model: Model): StreamInferenceHandler {
    return this.streamInferenceRegistry.getHandler(model.provider);
  }
}

// Undici fetch aborts surface as DOMException named AbortError; some provider
// SDKs throw plain Errors with the same name. DOMException is checked
// separately because it does not reliably pass `instanceof Error` across
// realms (e.g. under Jest's sandboxed globals).
function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  );
}
