import { randomUUID } from 'crypto';
import type { CountTokensCommand } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.command';
import type { CountTokensUseCase } from 'src/common/token-counter/application/use-cases/count-tokens/count-tokens.use-case';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { InferenceResponse } from 'src/domain/models/application/models/inference-response';
import type { GetInferenceCommand } from 'src/domain/models/application/use-cases/get-inference/get-inference.command';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { ResolveRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/resolve-recording-summary-model/resolve-recording-summary-model.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  RecordingSummaryGenerationFailedError,
  RecordingTranscriptTooLongError,
} from 'src/domain/recordings/application/recordings.errors';
import { TeamRecording } from 'src/domain/recordings/domain/team-recording.entity';
import type { GetSourceTranscriptSegmentsUseCase } from 'src/domain/sources/application/use-cases/get-source-transcript-segments/get-source-transcript-segments.use-case';
import type { TranscriptSegment } from 'src/domain/transcriptions/domain/recording-transcript';
import type { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';
import type {
  InferenceAdmissionGuard,
  InferencePrincipal,
} from 'src/iam/quotas/application/services/inference-admission-guard.service';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import {
  RecordingSummaryWriter,
  SUMMARY_OUTPUT_TOKENS,
} from './recording-summary-writer.service';

describe(RecordingSummaryWriter.name, () => {
  const orgId = randomUUID();
  const billedUserId = randomUUID();
  const audioSourceId = randomUUID();
  const recording = new TeamRecording({
    name: 'Council meeting',
    orgId,
    teamId: randomUUID(),
    createdByUserId: randomUUID(),
  });
  const segments: TranscriptSegment[] = [
    { text: 'We adopt the budget.', start: 0, end: 2, speakerId: 'speaker_0' },
    { text: 'Agreed.', start: 2, end: 3, speakerId: 'speaker_1' },
  ];

  function model(contextWindowSize = 128_000) {
    return new LanguageModel({
      name: 'mistral-large-latest',
      displayName: 'Mistral Large (Mistral)',
      provider: ModelProvider.MISTRAL,
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      contextWindowSize,
      isArchived: false,
      inputTokenCost: 2,
      outputTokenCost: 6,
    });
  }

  function setup(
    options: {
      contextWindowSize?: number;
      usage?: InferenceResponse['meta'];
      admission?: Error;
    } = {},
  ) {
    const summaryModel = model(options.contextWindowSize);
    const admitted: InferencePrincipal[] = [];
    const admission = {
      ensureModelCallAllowed: (principal: InferencePrincipal) => {
        admitted.push(principal);
        return options.admission
          ? Promise.reject(options.admission)
          : Promise.resolve();
      },
    };
    const inferences: GetInferenceCommand[] = [];
    const getInference = {
      execute: async (command: GetInferenceCommand) => {
        inferences.push(command);
        const response = new InferenceResponse(
          [new TextMessageContent('## Subject\n\nBudget 2027')],
          options.usage ?? { inputTokens: 1200, outputTokens: 300 },
        );
        await command.onUsage?.(response.meta);
        return response;
      },
    };
    const collectUsage = {
      collectCritical: jest.fn().mockResolvedValue(undefined),
    };
    const writer = new RecordingSummaryWriter(
      {
        execute: () =>
          Promise.resolve(
            new PermittedLanguageModel({ model: summaryModel, orgId }),
          ),
      } as unknown as ResolveRecordingSummaryModelUseCase,
      {
        execute: () => Promise.resolve(segments),
      } as unknown as GetSourceTranscriptSegmentsUseCase,
      {
        // One token per character keeps the arithmetic visible.
        execute: (command: CountTokensCommand) => command.text.length,
      } as unknown as CountTokensUseCase,
      admission as unknown as InferenceAdmissionGuard,
      getInference as unknown as GetInferenceUseCase,
      collectUsage as unknown as CollectUsageAsyncService,
    );
    return { writer, summaryModel, admitted, inferences, collectUsage };
  }

  it('bills the summary of the speaker-labelled transcript to the given user, with the summary model', async () => {
    const { writer, summaryModel, admitted, inferences, collectUsage } =
      setup();

    const generated = await writer.write(
      recording,
      audioSourceId,
      billedUserId,
    );

    expect(admitted).toEqual([{ userId: billedUserId, orgId }]);
    expect(collectUsage.collectCritical).toHaveBeenCalledWith(
      summaryModel,
      1200,
      300,
    );
    expect(generated).toMatchObject({
      content: '## Subject\n\nBudget 2027',
      modelId: summaryModel.id,
      modelName: 'Mistral Large (Mistral)',
    });
    const [inference] = inferences;
    const input = (inference.messages[0].content[0] as TextMessageContent).text;
    expect(input).toContain('Recording: Council meeting');
    expect(input).toContain('Speaker 1: We adopt the budget.');
    expect(input).toContain('Speaker 2: Agreed.');
  });

  it('asks for minutes in the language of the transcript and does not take speaker labels for names', async () => {
    const { writer, inferences } = setup();

    await writer.write(recording, audioSourceId, billedUserId);

    expect(inferences[0].instructions).toContain(
      'Write the minutes in the language of the transcript',
    );
    expect(inferences[0].instructions).toContain(
      'Speaker labels are not names',
    );
  });

  it('refuses a transcript beyond the context window before the paid call', async () => {
    const { writer, admitted, inferences } = setup({
      contextWindowSize: SUMMARY_OUTPUT_TOKENS + 100,
    });

    await expect(
      writer.write(recording, audioSourceId, billedUserId),
    ).rejects.toBeInstanceOf(RecordingTranscriptTooLongError);
    expect(admitted).toEqual([]);
    expect(inferences).toEqual([]);
  });

  it('makes no call when the budget of the org is used up', async () => {
    const { writer, inferences } = setup({
      admission: new CreditBudgetExceededError(),
    });

    await expect(
      writer.write(recording, audioSourceId, billedUserId),
    ).rejects.toBeInstanceOf(CreditBudgetExceededError);
    expect(inferences).toEqual([]);
  });

  it('hands out no summary of a paid call that reported no usage', async () => {
    const { writer } = setup({ usage: {} });

    await expect(
      writer.write(recording, audioSourceId, billedUserId),
    ).rejects.toBeInstanceOf(RecordingSummaryGenerationFailedError);
  });
});
