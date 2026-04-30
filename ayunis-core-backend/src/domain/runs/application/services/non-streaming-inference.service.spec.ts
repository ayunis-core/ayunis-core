import { NonStreamingInferenceService } from './non-streaming-inference.service';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { InferenceCompletedEvent } from '../events/inference-completed.event';
import { randomUUID } from 'crypto';

describe('NonStreamingInferenceService', () => {
  let service: NonStreamingInferenceService;
  let getInferenceUseCase: { execute: jest.Mock };
  let mockEventEmitter: { emitAsync: jest.Mock };
  let mockContextService: { get: jest.Mock; requirePrincipal: jest.Mock };

  const model = { name: 'gpt-4o', provider: 'openai' } as LanguageModel;
  const messages = [] as Message[];
  const tools = [] as Tool[];

  const userId = randomUUID();
  const orgId = randomUUID();

  beforeEach(() => {
    getInferenceUseCase = { execute: jest.fn() };
    mockEventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    mockContextService = {
      get: jest.fn().mockImplementation((key?: string | symbol) => {
        if (key === 'userId') return userId;
        if (key === 'orgId') return orgId;
        return undefined;
      }),
      requirePrincipal: jest.fn().mockReturnValue({
        kind: 'user',
        userId,
        orgId,
        role: 'user',
        systemRole: 'user',
      }),
    };

    service = new NonStreamingInferenceService(
      getInferenceUseCase as unknown as GetInferenceUseCase,
      mockContextService as never,
      mockEventEmitter as never,
    );
  });

  it('should return inference response and emit InferenceCompletedEvent', async () => {
    const response = new InferenceResponse([], {
      inputTokens: 100,
      outputTokens: 50,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);

    const result = await service.execute({ model, messages, tools });

    expect(result).toBe(response);
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        principalKind: 'user',
        userId,
        apiKeyId: null,
        orgId,
        model: 'gpt-4o',
        provider: 'openai',
        streaming: false,
        error: undefined,
      }),
    );
  });

  it('should emit principal-aware event for api-key callers', async () => {
    const apiKeyId = randomUUID();
    mockContextService.requirePrincipal.mockReturnValue({
      kind: 'apiKey',
      apiKeyId,
      orgId,
      role: 'user',
      systemRole: 'user',
    });
    const response = new InferenceResponse([], {
      inputTokens: 10,
      outputTokens: 5,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);

    await service.execute({ model, messages, tools });

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        principalKind: 'apiKey',
        userId: null,
        apiKeyId,
        orgId,
      }),
    );
  });

  it('should skip emit when no principal in context', async () => {
    mockContextService.requirePrincipal.mockImplementation(() => {
      throw new Error('no principal');
    });
    const response = new InferenceResponse([], {
      inputTokens: 1,
      outputTokens: 1,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);

    await service.execute({ model, messages, tools });

    expect(mockEventEmitter.emitAsync).not.toHaveBeenCalled();
  });

  it('should emit event with error and rethrow when inference fails', async () => {
    const error = new Error('Request timeout');
    getInferenceUseCase.execute.mockRejectedValue(error);

    await expect(service.execute({ model, messages, tools })).rejects.toThrow(
      error,
    );

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        model: 'gpt-4o',
        provider: 'openai',
        streaming: false,
        error: { message: 'Request timeout', statusCode: undefined },
      }),
    );
  });

  it('should emit event with statusCode when error has status property', async () => {
    const error = Object.assign(new Error('Too Many Requests'), {
      status: 429,
    });
    getInferenceUseCase.execute.mockRejectedValue(error);

    await expect(service.execute({ model, messages, tools })).rejects.toThrow(
      error,
    );

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        error: { message: 'Too Many Requests', statusCode: 429 },
      }),
    );
  });

  it('should handle non-Error exceptions', async () => {
    const nonErrorObj = { message: 'some failure', statusCode: 500 };
    getInferenceUseCase.execute.mockRejectedValue(nonErrorObj);

    await expect(service.execute({ model, messages, tools })).rejects.toBe(
      nonErrorObj,
    );

    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      InferenceCompletedEvent.EVENT_NAME,
      expect.objectContaining({
        error: { message: 'some failure', statusCode: 500 },
      }),
    );
  });

  it('should not propagate event emission failures', async () => {
    const response = new InferenceResponse([], {
      inputTokens: 10,
      outputTokens: 5,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);
    mockEventEmitter.emitAsync.mockRejectedValue(
      new Error('event emitter broken'),
    );

    const result = await service.execute({ model, messages, tools });

    expect(result).toBe(response);
  });

  it('should not propagate event emission failures on inference error path', async () => {
    const inferenceError = new Error('some provider error');
    getInferenceUseCase.execute.mockRejectedValue(inferenceError);
    mockEventEmitter.emitAsync.mockRejectedValue(
      new Error('event emitter broken'),
    );

    await expect(service.execute({ model, messages, tools })).rejects.toThrow(
      inferenceError,
    );
  });
});
