import { Appsignal, setError } from '@appsignal/nodejs';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { ApplicationError } from './base.error';
import { ProviderTimeoutError } from './provider.errors';
import { reportUnexpectedError } from './report-unexpected-error.helper';

const mockIncrementCounter = jest.fn();

jest.mock('@appsignal/nodejs', () => ({
  Appsignal: {
    client: {
      metrics: jest.fn(() => ({ incrementCounter: mockIncrementCounter })),
    },
  },
  setError: jest.fn(),
}));

const incrementCounter = Appsignal.client.metrics()
  .incrementCounter as jest.Mock;

class TestApplicationError extends ApplicationError {
  constructor(statusCode: number) {
    super('boom', 'TEST_ERROR', statusCode);
  }
}

describe('reportUnexpectedError', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports ApplicationErrors with a 5xx status', () => {
    const error = new TestApplicationError(504);

    reportUnexpectedError(error);

    expect(setError).toHaveBeenCalledWith(error);
  });

  it('does not report ApplicationErrors below 500 — expected client outcomes', () => {
    reportUnexpectedError(new TestApplicationError(429));

    expect(setError).not.toHaveBeenCalled();
  });

  it('reports HttpExceptions with a 5xx status', () => {
    const error = new BadGatewayException();

    reportUnexpectedError(error);

    expect(setError).toHaveBeenCalledWith(error);
  });

  it('does not report HttpExceptions below 500', () => {
    reportUnexpectedError(new BadRequestException());

    expect(setError).not.toHaveBeenCalled();
  });

  it('reports unclassified errors', () => {
    const error = new Error('unexpected');

    reportUnexpectedError(error);

    expect(setError).toHaveBeenCalledWith(error);
  });

  it('wraps non-Error throwables so they still reach AppSignal', () => {
    reportUnexpectedError('string failure');

    expect(setError).toHaveBeenCalledWith(expect.any(Error));
    const reported = (setError as jest.Mock).mock.calls[0][0] as Error;
    expect(reported.message).toBe('string failure');
  });

  // Domain wrappers keep their user-facing code, but the incident must group
  // under the classified PROVIDER_UNAVAILABLE_* key carried on `cause`.
  it('reports the classified provider failure carried on the cause chain', () => {
    const providerFailure = new ProviderTimeoutError({ provider: 'anonymize' });
    const wrapper = new TestApplicationError(503);
    wrapper.cause = providerFailure;

    reportUnexpectedError(wrapper);

    expect(setError).toHaveBeenCalledWith(providerFailure);
  });

  it('increments the provider counter with only the provider tag on web reporting paths', () => {
    reportUnexpectedError(new ProviderTimeoutError({ provider: 'bedrock' }));

    expect(incrementCounter).toHaveBeenCalledWith(
      'provider_unavailable_count',
      1,
      { provider: 'bedrock' },
    );
  });

  it('does not double count the same provider failure through reporting wrappers', () => {
    const providerFailure = new ProviderTimeoutError({ provider: 'azure' });
    const wrapper = new TestApplicationError(503);
    wrapper.cause = providerFailure;

    reportUnexpectedError(providerFailure);
    reportUnexpectedError(wrapper);

    expect(incrementCounter).toHaveBeenCalledTimes(1);
  });

  it('still reports the incident when custom metric reporting fails', () => {
    const providerFailure = new ProviderTimeoutError({ provider: 'openai' });
    incrementCounter.mockImplementationOnce(() => {
      throw new Error('metrics unavailable');
    });

    expect(() => reportUnexpectedError(providerFailure)).not.toThrow();
    expect(setError).toHaveBeenCalledWith(providerFailure);
  });

  it('does not unwrap the cause of expected (<500) errors', () => {
    const wrapper = new TestApplicationError(422);
    wrapper.cause = new ProviderTimeoutError({ provider: 'anonymize' });

    reportUnexpectedError(wrapper);

    expect(setError).not.toHaveBeenCalled();
  });
});
