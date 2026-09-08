import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, catchError, finalize, map, throwError } from 'rxjs';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import {
  InferenceFailedError,
  InferenceTokenLimitError,
} from 'src/domain/models/application/models.errors';
import { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import { StreamInferenceInput } from 'src/domain/models/application/ports/stream-inference.handler';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { OpenAIRequestMapper } from 'src/domain/openai-compat/application/mappers/openai-request.mapper';
import { OpenAIResponseMapper } from 'src/domain/openai-compat/application/mappers/openai-response.mapper';
import {
  OpenAIStreamMapper,
  OpenAIStreamSession,
} from 'src/domain/openai-compat/application/mappers/openai-stream.mapper';
import {
  OpenAIInvalidRequestError,
  OpenAIModelNotFoundError,
  OpenAITokenLimitError,
  OpenAIUnexpectedError,
} from 'src/domain/openai-compat/application/openai-compat.errors';
import { ExecuteOpenAIChatCompletionCommand } from './execute-openai-chat-completion.command';
import { OpenAIFileContentService } from 'src/domain/openai-compat/application/services/openai-file-content.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { ChatCompletionResponse } from 'src/domain/openai-compat/application/types/openai-response.types';
import type { ChatCompletionChunk } from 'src/domain/openai-compat/application/types/openai-chunk.types';
import { ProviderErrorReason } from 'src/common/errors/extract-provider-error-diagnostics.helper';

/**
 * Sole orchestrator on the OpenAI-compat path. Wraps `Get/StreamInference`
 * and is the only caller of `InferenceUsageGuard` on this surface.
 * The controller stays purely DTO↔command + SSE framing + HTTP filter.
 *
 * Streaming usage is recorded via RxJS `finalize()` so the accumulator
 * runs on complete, error, AND unsubscribe (client disconnect alike).
 * Totals are summed across chunks — never last-wins (AYC-92 streaming
 * usage-drift bug).
 */
@Injectable()
export class ExecuteOpenAIChatCompletionUseCase {
  private readonly logger = new Logger(ExecuteOpenAIChatCompletionUseCase.name);

  constructor(
    private readonly getPermittedLanguageModelsUseCase: GetPermittedLanguageModelsUseCase,
    private readonly getInferenceUseCase: GetInferenceUseCase,
    private readonly streamInferenceUseCase: StreamInferenceUseCase,
    private readonly inferenceUsageGuard: InferenceUsageGuard,
    private readonly fileContentService: OpenAIFileContentService,
    private readonly requestMapper: OpenAIRequestMapper,
    private readonly responseMapper: OpenAIResponseMapper,
    private readonly streamMapper: OpenAIStreamMapper,
  ) {}

  @HandleUnexpectedErrors(OpenAIUnexpectedError)
  async executeNonStreaming(
    command: ExecuteOpenAIChatCompletionCommand,
  ): Promise<ChatCompletionResponse> {
    const { model, threadId } = await this.prepare(command);
    const request = await this.fileContentService.expand(command.request);
    const { systemPrompt, messages } = this.requestMapper.toDomainMessages(
      request,
      threadId,
    );

    const requestId = this.requestMapper.newRequestId();
    const tools = this.requestMapper.toToolSchemas(request);

    const response = await this.executeNonStreamingInference(
      new GetInferenceCommand({
        model,
        messages,
        tools,
        toolChoice: this.requestMapper.toModelToolChoice(request),
        instructions: systemPrompt || undefined,
        acceptTokenLimitCompletion: true,
      }),
    );

    if (
      response.meta.inputTokens !== undefined &&
      response.meta.outputTokens !== undefined
    ) {
      this.inferenceUsageGuard.collectUsage(
        model,
        {
          inputTokens: response.meta.inputTokens,
          outputTokens: response.meta.outputTokens,
        },
        requestId,
      );
    }

    return this.responseMapper.toResponse({
      id: this.completionId(),
      modelName: command.request.model,
      response,
      tools,
    });
  }

  private async executeNonStreamingInference(
    command: GetInferenceCommand,
  ): ReturnType<GetInferenceUseCase['execute']> {
    try {
      return await this.getInferenceUseCase.execute(command);
    } catch (error) {
      if (error instanceof InferenceTokenLimitError) {
        throw new OpenAITokenLimitError(error.metadata);
      }
      throw this.mapProviderInputError(error);
    }
  }

  @HandleUnexpectedErrors(OpenAIUnexpectedError)
  async executeStreaming(
    command: ExecuteOpenAIChatCompletionCommand,
  ): Promise<Observable<ChatCompletionChunk>> {
    const { model, threadId } = await this.prepare(command);
    const request = await this.fileContentService.expand(command.request);
    const { systemPrompt, messages } = this.requestMapper.toDomainMessages(
      request,
      threadId,
    );

    const requestId = this.requestMapper.newRequestId();
    const completionId = this.completionId();

    const source$ = this.streamInferenceUseCase.execute(
      new StreamInferenceInput({
        model,
        messages,
        systemPrompt,
        tools: this.requestMapper.toToolSchemas(request),
        toolChoice: this.requestMapper.toModelToolChoice(request),
        orgId: command.principal.orgId,
      }),
    );

    // Closures capture the running totals so `finalize` can read whatever
    // landed before complete / error / unsubscribe. Sum-across-chunks, not
    // last-wins (AYC-92 streaming drift bug).
    const totals = { inputTokens: 0, outputTokens: 0 };
    let isFirst = true;
    // Per-stream session — currently translates provider-native tool-call
    // indices into OpenAI's contiguous zero-based numbering.
    const session = new OpenAIStreamSession();

    return this.mapProviderInputErrors(source$).pipe(
      map((chunk) => {
        if (chunk.usage) {
          totals.inputTokens += chunk.usage.inputTokens ?? 0;
          totals.outputTokens += chunk.usage.outputTokens ?? 0;
        }
        const mapped = this.streamMapper.toChunk({
          id: completionId,
          modelName: command.request.model,
          chunk,
          isFirst,
          session,
        });
        isFirst = false;
        return mapped;
      }),
      // Drop chunks that mapped to null (e.g. empty deltas).
      filterNonNull(),
      finalize(() => {
        if (totals.inputTokens > 0 || totals.outputTokens > 0) {
          this.inferenceUsageGuard.collectUsage(model, totals, requestId);
        }
      }),
    );
  }

  private async prepare(command: ExecuteOpenAIChatCompletionCommand): Promise<{
    model: LanguageModel;
    threadId: ReturnType<typeof randomUUID>;
  }> {
    const model = await this.resolveModel(
      command.principal.orgId,
      command.request.model,
    );
    await this.inferenceUsageGuard.preflight(command.principal, model);
    // Synthetic threadId for the domain Message entities — OpenAI-compat is
    // stateless, no thread persistence. Mappers only require a non-null UUID.
    const threadId = randomUUID();
    return { model, threadId };
  }

  private async resolveModel(
    orgId: ReturnType<typeof randomUUID>,
    modelName: string,
  ): Promise<LanguageModel> {
    const permitted = await this.getPermittedLanguageModelsUseCase.execute(
      new GetPermittedLanguageModelsQuery(orgId),
    );
    const match = permitted.find((pm) => pm.model.name === modelName);
    if (!match) {
      this.logger.debug(
        {
          orgId,
          requestedModel: modelName,
        },
        'OpenAI-compat model not found',
      );
      throw new OpenAIModelNotFoundError(modelName);
    }
    return match.model;
  }

  private completionId(): string {
    return `chatcmpl-${randomUUID()}`;
  }

  private mapProviderInputError(error: unknown): unknown {
    if (!isProviderRequestRejection(error)) return error;
    const reason = error.metadata?.upstreamReason;
    if (reason === ProviderErrorReason.CONTEXT_LENGTH_EXCEEDED) {
      return new OpenAIInvalidRequestError(
        "Request exceeds the model's context length",
        error.metadata,
      );
    }
    if (reason === ProviderErrorReason.INVALID_TOOL_SCHEMA) {
      const param = error.metadata?.upstreamParam;
      const location = typeof param === 'string' ? ` at '${param}'` : '';
      return new OpenAIInvalidRequestError(
        `Invalid tool schema${location}`,
        error.metadata,
      );
    }
    return error;
  }

  private mapProviderInputErrors<T>(source$: Observable<T>): Observable<T> {
    return source$.pipe(
      catchError((error: unknown) =>
        throwError(() => this.mapProviderInputError(error)),
      ),
    );
  }
}

function isProviderRequestRejection(
  error: unknown,
): error is InferenceFailedError {
  if (!(error instanceof InferenceFailedError)) return false;
  const status = error.metadata?.upstreamStatus;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/** RxJS operator: drop null/undefined emissions, narrow the type. */
function filterNonNull<T>() {
  return (source: Observable<T | null>): Observable<T> =>
    new Observable<T>((subscriber) => {
      return source.subscribe({
        next: (value) => {
          if (value !== null) subscriber.next(value);
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
    });
}
