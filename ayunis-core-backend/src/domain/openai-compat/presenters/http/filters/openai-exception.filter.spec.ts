import type { ArgumentsHost } from '@nestjs/common';
import type { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { ProviderRequestRejectedError } from 'src/common/errors/provider.errors';
import { OpenAIErrorMapper } from 'src/domain/openai-compat/application/mappers/openai-error.mapper';
import { OpenAIExceptionFilter } from './openai-exception.filter';

jest.mock('src/common/errors/report-unexpected-error.helper', () => ({
  reportUnexpectedError: jest.fn(),
}));

function hostFor(response: object): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url: '/api/openai-compat/v1/chat/completions' }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

describe('OpenAIExceptionFilter', () => {
  const filter = new OpenAIExceptionFilter(
    new OpenAIErrorMapper(),
    {} as ApplicationErrorFilter,
  );

  it('returns provider retry timing as headers on an uncommitted response', () => {
    const response = {
      headersSent: false,
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    filter.catch(
      new ProviderRequestRejectedError({
        provider: 'azure',
        upstreamStatus: 429,
        retryAfterMs: 1_200,
      }),
      hostFor(response),
    );

    expect(response.set).toHaveBeenCalledWith({
      'retry-after-ms': '1200',
      'retry-after': '2',
    });
    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith({
      error: expect.objectContaining({
        type: 'server_error',
        code: 'PROVIDER_UNAVAILABLE_REJECTED_AZURE',
      }),
    });
  });
});
