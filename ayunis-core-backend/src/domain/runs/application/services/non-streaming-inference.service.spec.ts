import { Logger } from '@nestjs/common';
import { NonStreamingInferenceService } from './non-streaming-inference.service';
import type { GetInferenceUseCase } from 'src/domain/models/application/use-cases/get-inference/get-inference.use-case';
import { InferenceResponse } from 'src/domain/models/application/ports/inference.handler';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';

describe('NonStreamingInferenceService', () => {
  let service: NonStreamingInferenceService;
  let getInferenceUseCase: { execute: jest.Mock };
  let histogram: { observe: jest.Mock };
  let errorCounter: { inc: jest.Mock };

  const model = { name: 'gpt-4o', provider: 'openai' } as LanguageModel;
  const messages = [] as Message[];
  const tools = [] as Tool[];

  beforeEach(() => {
    getInferenceUseCase = { execute: jest.fn() };
    histogram = { observe: jest.fn() };
    errorCounter = { inc: jest.fn() };

    service = new NonStreamingInferenceService(
      getInferenceUseCase as unknown as GetInferenceUseCase,
      histogram as never,
      errorCounter as never,
    );

    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  it('should return inference response and observe duration on histogram', async () => {
    const response = new InferenceResponse([], {
      inputTokens: 100,
      outputTokens: 50,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);

    const result = await service.execute({ model, messages, tools });

    expect(result).toBe(response);
    expect(histogram.observe).toHaveBeenCalledWith(
      { model: 'gpt-4o', provider: 'openai', streaming: 'false' },
      expect.any(Number),
    );
    expect(errorCounter.inc).not.toHaveBeenCalled();
  });

  it('should increment error counter and rethrow when inference fails', async () => {
    const error = Object.assign(new Error('Request timeout'), { status: 408 });
    getInferenceUseCase.execute.mockRejectedValue(error);

    await expect(service.execute({ model, messages, tools })).rejects.toThrow(
      error,
    );

    expect(histogram.observe).toHaveBeenCalled();
    expect(errorCounter.inc).toHaveBeenCalledWith({
      model: 'gpt-4o',
      provider: 'openai',
      error_type: 'timeout',
      streaming: 'false',
    });
  });

  it('should not propagate metric failures from histogram', async () => {
    const response = new InferenceResponse([], {
      inputTokens: 10,
      outputTokens: 5,
    });
    getInferenceUseCase.execute.mockResolvedValue(response);
    histogram.observe.mockImplementation(() => {
      throw new Error('prometheus broken');
    });

    const result = await service.execute({ model, messages, tools });

    expect(result).toBe(response);
  });

  it('should not propagate metric failures from error counter', async () => {
    const inferenceError = new Error('some provider error');
    getInferenceUseCase.execute.mockRejectedValue(inferenceError);
    errorCounter.inc.mockImplementation(() => {
      throw new Error('prometheus broken');
    });

    await expect(service.execute({ model, messages, tools })).rejects.toThrow(
      inferenceError,
    );
  });
});
