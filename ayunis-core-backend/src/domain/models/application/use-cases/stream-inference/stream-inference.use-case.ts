import { Observable, catchError, throwError } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { StreamInferenceHandlerRegistry } from 'src/domain/models/application/registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from 'src/domain/models/application/ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from 'src/domain/models/application/ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
} from 'src/domain/models/application/models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import {
  extractProviderErrorDiagnostics,
  type ProviderErrorDiagnostics,
} from 'src/common/errors/extract-provider-error-diagnostics.helper';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import { stripReplayedToolNulls } from 'src/domain/models/application/helpers/strip-replayed-tool-nulls.helper';

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
      this.logger.log(
        {
          model: input.model.name,
          provider: input.model.provider,
        },
        'Streaming inference aborted by client',
      );
      return new InferenceAbortedError();
    }
    const providerError = wrapProviderFailure(error, {
      provider: input.model.provider,
      modelId: input.model.name,
    });
    if (providerError) {
      this.logger.error(
        {
          code: providerError.code,
          ...providerError.context,
        },
        'Provider unavailable during stream inference',
      );
      return providerError;
    }
    const diagnostics = extractProviderErrorDiagnostics(error);
    const status = diagnostics.upstreamStatus;
    const message = error instanceof Error ? error.message : String(error);
    this.logProviderInferenceFailed(error, input, diagnostics);
    // Anthropic/Bedrock reject oversized images with "image exceeds N MB
    // maximum" — surface a distinct code so the UI can tell the user to shrink
    // it instead of showing a generic failure.
    if (/image exceeds .* maximum/i.test(message)) {
      return new InferenceImageTooLargeError({ status });
    }
    return new InferenceFailedError('Provider inference failed', {
      status,
      ...diagnostics,
    });
  }

  private logProviderInferenceFailed(
    error: unknown,
    input: StreamInferenceInput,
    diagnostics: ProviderErrorDiagnostics,
  ): void {
    this.logger.error(
      {
        model: input.model.name,
        provider: input.model.provider,
        messageCount: input.messages.length,
        toolCount: input.tools.length,
        toolChoice: input.toolChoice,
        errorName: error instanceof Error ? error.name : 'Unknown',
        status: diagnostics.upstreamStatus,
        ...diagnostics,
      },
      'Provider stream inference failed',
    );
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
