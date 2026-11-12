import { Injectable } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import type { InferenceResponse } from 'src/domain/models/application/models/inference-response';
import { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { ResolveRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/resolve-recording-summary-model/resolve-recording-summary-model.use-case';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelToolChoice } from 'src/domain/models/domain/value-objects/model-tool-choice.enum';
import {
  RECORDING_SUMMARY_INSTRUCTIONS,
  recordingSummaryInput,
} from 'src/domain/recordings/application/models/recording-summary-prompt';
import type { GeneratedRecordingSummary } from 'src/domain/recordings/application/ports/recording-summary.repository';
import {
  RecordingSummaryGenerationFailedError,
  RecordingTranscriptEmptyError,
  RecordingTranscriptTooLongError,
} from 'src/domain/recordings/application/recordings.errors';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { GetSourceTranscriptSegmentsQuery } from 'src/domain/sources/application/use-cases/get-source-transcript-segments/get-source-transcript-segments.query';
import { GetSourceTranscriptSegmentsUseCase } from 'src/domain/sources/application/use-cases/get-source-transcript-segments/get-source-transcript-segments.use-case';
import {
  formatTurn,
  toTranscriptTurns,
} from 'src/domain/transcriptions/domain/transcript-turns';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import { InferenceAdmissionGuard } from 'src/iam/quotas/application/services/inference-admission-guard.service';

/** Room the summary itself needs in the model's context window. */
export const SUMMARY_OUTPUT_TOKENS = 4096;

/**
 * Writes a recording's summary with the org's summary model, as one paid call
 * billed to `billedUserId`: admitted against the org budget and the user's
 * credit limits (fair-use message quotas don't apply), and recorded as their
 * usage. A transcript beyond the model's context window is refused before
 * the call.
 */
@Injectable()
export class RecordingSummaryWriter {
  constructor(
    private readonly resolveModel: ResolveRecordingSummaryModelUseCase,
    private readonly transcriptSegments: GetSourceTranscriptSegmentsUseCase,
    private readonly countTokens: CountTokensUseCase,
    private readonly admission: InferenceAdmissionGuard,
    private readonly getInference: GetInferenceUseCase,
    private readonly collectUsage: CollectUsageAsyncService,
  ) {}

  async write(
    recording: Recording,
    audioSourceId: UUID,
    billedUserId: UUID,
  ): Promise<GeneratedRecordingSummary> {
    const { model } = await this.resolveModel.execute();
    const lines = await this.transcriptLines(recording, audioSourceId);
    const input = recordingSummaryInput(recording.name, lines);
    this.ensureFits(model, input);
    await this.admission.ensureModelCallAllowed(
      { userId: billedUserId, orgId: recording.orgId },
      model,
    );
    const response = await this.getInference.execute(
      new GetInferenceCommand({
        model,
        instructions: RECORDING_SUMMARY_INSTRUCTIONS,
        messages: [
          new UserMessage({
            threadId: randomUUID(),
            content: [new TextMessageContent(input)],
          }),
        ],
        tools: [],
        toolChoice: ModelToolChoice.AUTO,
        onUsage: (usage) => this.recordUsage(model, usage),
      }),
    );
    return {
      content: this.summaryOf(response),
      modelId: model.id,
      modelName: model.displayName,
      generatedAt: new Date(),
    };
  }

  private async transcriptLines(
    recording: Recording,
    audioSourceId: UUID,
  ): Promise<string[]> {
    const segments = await this.transcriptSegments.execute(
      new GetSourceTranscriptSegmentsQuery(audioSourceId),
    );
    const lines = toTranscriptTurns(segments).map(formatTurn);
    if (lines.length === 0)
      throw new RecordingTranscriptEmptyError(recording.id);
    return lines;
  }

  private ensureFits(model: LanguageModel, input: string): void {
    const transcriptTokens =
      this.countTokens.execute(
        new CountTokensCommand(RECORDING_SUMMARY_INSTRUCTIONS),
      ) + this.countTokens.execute(new CountTokensCommand(input));
    if (transcriptTokens + SUMMARY_OUTPUT_TOKENS > model.contextWindowSize) {
      throw new RecordingTranscriptTooLongError({
        transcriptTokens,
        contextWindow: model.contextWindowSize,
      });
    }
  }

  // Same contract as the skill text improver: a paid call that reports no
  // usage, or whose usage cannot be persisted, must not hand out its result,
  // or the budget its admission checked is never charged.
  private async recordUsage(
    model: LanguageModel,
    usage: InferenceResponse['meta'],
  ): Promise<void> {
    const reported =
      usage.inputTokens !== undefined || usage.outputTokens !== undefined;
    if (!reported) {
      if (model.consumesCredits) {
        throw new RecordingSummaryGenerationFailedError(
          'paid model call reported no usage',
        );
      }
      return;
    }
    await this.collectUsage.collectCritical(
      model,
      usage.inputTokens ?? 0,
      usage.outputTokens ?? 0,
    );
  }

  private summaryOf(response: InferenceResponse): string {
    const summary = response.content
      .filter((content) => content instanceof TextMessageContent)
      .map((content) => content.text)
      .join('')
      .trim();
    if (!summary) {
      throw new RecordingSummaryGenerationFailedError('empty response');
    }
    return summary;
  }
}
