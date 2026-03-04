import { GeneratePersonalizedSystemPromptUseCase } from './generate-personalized-system-prompt.use-case';
import { GeneratePersonalizedSystemPromptCommand } from './generate-personalized-system-prompt.command';
import { PersonalizedSystemPromptGenerationError } from '../../chat-settings.errors';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import {
  DefaultModelNotFoundError,
  InferenceFailedError,
} from 'src/domain/models/application/models.errors';
import { randomUUID } from 'crypto';
import { UserSystemPrompt } from '../../../domain/user-system-prompt.entity';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import type { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import type { UpsertUserSystemPromptUseCase } from '../upsert-user-system-prompt/upsert-user-system-prompt.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';

const userId = randomUUID();
const orgId = randomUUID();

const mockLanguageModel = {
  id: randomUUID(),
  name: 'gpt-4',
  provider: 'openai',
} as unknown as LanguageModel;

const mockPermittedModel = {
  id: randomUUID(),
  model: mockLanguageModel,
  orgId,
  isDefault: true,
} as unknown as PermittedLanguageModel;

function createMockInferenceResponse(text: string): InferenceResponse {
  return {
    content: [new TextMessageContent(text)],
    meta: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
  } as InferenceResponse;
}

describe('GeneratePersonalizedSystemPromptUseCase', () => {
  let useCase: GeneratePersonalizedSystemPromptUseCase;
  let getInferenceUseCase: jest.Mocked<Pick<GetInferenceUseCase, 'execute'>>;
  let getDefaultModelUseCase: jest.Mocked<
    Pick<GetDefaultModelUseCase, 'execute'>
  >;
  let upsertUserSystemPromptUseCase: jest.Mocked<
    Pick<UpsertUserSystemPromptUseCase, 'execute'>
  >;
  let contextService: { get: jest.Mock };

  beforeEach(() => {
    getInferenceUseCase = {
      execute: jest.fn(),
    };

    getDefaultModelUseCase = {
      execute: jest.fn(),
    };

    upsertUserSystemPromptUseCase = {
      execute: jest.fn(),
    };

    contextService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return orgId;
        return undefined;
      }),
    };

    useCase = new GeneratePersonalizedSystemPromptUseCase(
      getInferenceUseCase as unknown as GetInferenceUseCase,
      getDefaultModelUseCase as unknown as GetDefaultModelUseCase,
      upsertUserSystemPromptUseCase as unknown as UpsertUserSystemPromptUseCase,
      contextService as unknown as ContextService,
    );
  });

  it('should generate system prompt and welcome message when all fields are provided', async () => {
    const generatedSystemPrompt =
      'Hallo Maria! Ich kommuniziere locker und direkt mit dir und unterstütze dich bei deiner Arbeit im Sozialamt.';
    const generatedWelcome =
      'Willkommen, Maria! Schön, dass du da bist – wie kann ich dir heute helfen?';

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute
      .mockResolvedValueOnce(createMockInferenceResponse(generatedSystemPrompt))
      .mockResolvedValueOnce(createMockInferenceResponse(generatedWelcome));

    const result = await useCase.execute(
      new GeneratePersonalizedSystemPromptCommand({
        preferredName: 'Maria',
        communicationStyle: 'Locker & kurz',
        workContext: 'Bescheide im Sozialamt',
      }),
    );

    expect(result.systemPrompt).toBe(generatedSystemPrompt);
    expect(result.welcomeMessage).toBe(generatedWelcome);
    expect(getInferenceUseCase.execute).toHaveBeenCalledTimes(2);
    expect(upsertUserSystemPromptUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should generate meaningful prompt when only name is provided', async () => {
    const generatedSystemPrompt =
      'Hi Thomas! I will communicate in a friendly and helpful manner.';
    const generatedWelcome = 'Welcome, Thomas! How can I help you today?';

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute
      .mockResolvedValueOnce(createMockInferenceResponse(generatedSystemPrompt))
      .mockResolvedValueOnce(createMockInferenceResponse(generatedWelcome));

    const result = await useCase.execute(
      new GeneratePersonalizedSystemPromptCommand({
        preferredName: 'Thomas',
      }),
    );

    expect(result.systemPrompt).toBe(generatedSystemPrompt);
    expect(result.welcomeMessage).toBe(generatedWelcome);
    expect(getInferenceUseCase.execute).toHaveBeenCalledTimes(2);
    expect(upsertUserSystemPromptUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('should throw InferenceFailedError when inference fails', async () => {
    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute.mockRejectedValue(
      new InferenceFailedError('Model unavailable'),
    );

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Anna',
          communicationStyle: 'Professionell & ausführlich',
        }),
      ),
    ).rejects.toThrow(InferenceFailedError);
  });

  it('should throw DefaultModelNotFoundError when no default model exists', async () => {
    getDefaultModelUseCase.execute.mockRejectedValue(
      new DefaultModelNotFoundError(orgId),
    );

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Klaus',
        }),
      ),
    ).rejects.toThrow(DefaultModelNotFoundError);
  });

  it('should upsert the generated system prompt', async () => {
    const generatedSystemPrompt = 'Personalized prompt for Lisa.';
    const generatedWelcome = 'Welcome, Lisa!';

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute
      .mockResolvedValueOnce(createMockInferenceResponse(generatedSystemPrompt))
      .mockResolvedValueOnce(createMockInferenceResponse(generatedWelcome));

    await useCase.execute(
      new GeneratePersonalizedSystemPromptCommand({
        preferredName: 'Lisa',
      }),
    );

    expect(upsertUserSystemPromptUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ systemPrompt: generatedSystemPrompt }),
    );
  });

  it('should return empty welcome message when welcome generation fails', async () => {
    const generatedSystemPrompt = 'Personalized prompt for Eva.';

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute
      .mockResolvedValueOnce(createMockInferenceResponse(generatedSystemPrompt))
      .mockRejectedValueOnce(new Error('Welcome generation failed'));

    const result = await useCase.execute(
      new GeneratePersonalizedSystemPromptCommand({
        preferredName: 'Eva',
      }),
    );

    expect(result.systemPrompt).toBe(generatedSystemPrompt);
    expect(result.welcomeMessage).toBe('');
    expect(upsertUserSystemPromptUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ systemPrompt: generatedSystemPrompt }),
    );
  });

  it('should upsert system prompt before generating welcome message', async () => {
    const generatedSystemPrompt = 'Prompt for order check.';
    const callOrder: string[] = [];

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    upsertUserSystemPromptUseCase.execute.mockImplementation(async () => {
      callOrder.push('upsert');
      return new UserSystemPrompt({
        userId,
        systemPrompt: generatedSystemPrompt,
      });
    });
    getInferenceUseCase.execute
      .mockImplementationOnce(async () => {
        callOrder.push('inference:systemPrompt');
        return createMockInferenceResponse(generatedSystemPrompt);
      })
      .mockImplementationOnce(async () => {
        callOrder.push('inference:welcome');
        return createMockInferenceResponse('Welcome!');
      });

    await useCase.execute(
      new GeneratePersonalizedSystemPromptCommand({
        preferredName: 'Test',
      }),
    );

    expect(callOrder).toEqual([
      'inference:systemPrompt',
      'upsert',
      'inference:welcome',
    ]);
  });

  it('should throw PersonalizedSystemPromptGenerationError with generic message for unknown errors', async () => {
    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute.mockRejectedValue(
      new Error('Internal SDK error at host:3000'),
    );

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Max',
        }),
      ),
    ).rejects.toThrow(PersonalizedSystemPromptGenerationError);

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Max',
        }),
      ),
    ).rejects.toThrow('Failed to generate personalized system prompt');
  });

  it('should throw PersonalizedSystemPromptGenerationError when generated system prompt is empty', async () => {
    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute.mockResolvedValueOnce(
      createMockInferenceResponse('   '),
    );

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Lena',
        }),
      ),
    ).rejects.toThrow(PersonalizedSystemPromptGenerationError);

    expect(upsertUserSystemPromptUseCase.execute).not.toHaveBeenCalled();
  });

  it('should throw PersonalizedSystemPromptGenerationError when upsert fails', async () => {
    const generatedSystemPrompt = 'Personalized prompt for Jan.';

    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute.mockResolvedValueOnce(
      createMockInferenceResponse(generatedSystemPrompt),
    );
    upsertUserSystemPromptUseCase.execute.mockRejectedValue(
      new Error('Database connection lost'),
    );

    await expect(
      useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Jan',
        }),
      ),
    ).rejects.toThrow(PersonalizedSystemPromptGenerationError);
  });

  it('should preserve error cause when wrapping unknown errors', async () => {
    const originalError = new Error('Something broke');
    getDefaultModelUseCase.execute.mockResolvedValue(mockPermittedModel);
    getInferenceUseCase.execute.mockRejectedValue(originalError);

    try {
      await useCase.execute(
        new GeneratePersonalizedSystemPromptCommand({
          preferredName: 'Test',
        }),
      );
      fail('Expected error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PersonalizedSystemPromptGenerationError);
      expect((error as PersonalizedSystemPromptGenerationError).cause).toBe(
        originalError,
      );
    }
  });
});
