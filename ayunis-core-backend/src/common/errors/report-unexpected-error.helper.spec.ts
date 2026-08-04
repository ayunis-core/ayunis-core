import { setError } from '@appsignal/nodejs';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { ApplicationError } from './base.error';
import { reportUnexpectedError } from './report-unexpected-error.helper';

jest.mock('@appsignal/nodejs', () => ({
  setError: jest.fn(),
}));

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
});
