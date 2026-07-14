import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { randomUUID } from 'crypto';
import { Observable, finalize, map } from 'rxjs';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { StreamInferenceUseCase } from 'src/domain/models/application/use-cases/stream-inference/stream-inference.use-case';
import { StreamInferenceInput } from 'src/domain/models/application/ports/stream-inference.handler';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { GetPermittedLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.use-case';
import { GetPermittedLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-permitted-language-models/get-permitted-language-models.query';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';
import { OpenAIRequestMapper } from '../../mappers/openai-request.mapper';
import { OpenAIResponseMapper } from '../../mappers/openai-response.mapper';
import {
  OpenAIStreamMapper,
  OpenAIStreamSession,
} from '../../mappers/openai-stream.mapper';
import {
  OpenAIModelNotFoundError,
  OpenAIUnexpectedError,
} from '../../openai-compat.errors';
import { ExecuteOpenAIChatCompletionCommand } from './execute-openai-chat-completion.command';
import type { ChatCompletionResponse } from '../../types/openai-response.types';
import type { ChatCompletionChunk } from '../../types/openai-chunk.types';

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
    private readonly requestMapper: OpenAIRequestMapper,
    private readonly responseMapper: OpenAIResponseMapper,
    private readonly streamMapper: OpenAIStreamMapper,
  ) {}

  @HandleUnexpectedErrors(OpenAIUnexpectedError)
  async executeNonStreaming(
    command: ExecuteOpenAIChatCompletionCommand,
  ): Promise<ChatCompletionResponse> {
    const { model, threadId } = await this.prepare(command);
    const { systemPrompt, messages } = this.requestMapper.toDomainMessages(
      command.request,
      threadId,
    );

    const requestId = this.requestMapper.newRequestId();

    const response = await this.getInferenceUseCase.execute(
      new GetInferenceCommand({
        model,
        messages,
        tools: this.requestMapper.toToolSchemas(command.request),
        toolChoice: this.requestMapper.toModelToolChoice(command.request),
        instructions: systemPrompt || undefined,
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
    });
  }

  @HandleUnexpectedErrors(OpenAIUnexpectedError)
  async executeStreaming(
    command: ExecuteOpenAIChatCompletionCommand,
  ): Promise<Observable<ChatCompletionChunk>> {
    const { model, threadId } = await this.prepare(command);
    const { systemPrompt, messages } = this.requestMapper.toDomainMessages(
      command.request,
      threadId,
    );

    const requestId = this.requestMapper.newRequestId();
    const completionId = this.completionId();

    const source$ = this.streamInferenceUseCase.execute(
      new StreamInferenceInput({
        model,
        messages,
        systemPrompt,
        tools: this.requestMapper.toToolSchemas(command.request),
        toolChoice: this.requestMapper.toModelToolChoice(command.request),
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

    return source$.pipe(
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
      this.logger.debug('OpenAI-compat model not found', {
        orgId,
        requestedModel: modelName,
      });
      throw new OpenAIModelNotFoundError(modelName);
    }
    return match.model;
  }

  private completionId(): string {
    return `chatcmpl-${randomUUID()}`;
  }
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
