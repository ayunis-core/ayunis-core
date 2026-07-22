import { ApplicationError } from './base.error';

class TestError extends ApplicationError {
  constructor(statusCode: number, metadata?: Record<string, unknown>) {
    super('Something went wrong', 'TEST_ERROR', statusCode, metadata);
  }
}

describe('ApplicationError', () => {
  describe('toHttpException', () => {
    it('exposes code and message in the response body', () => {
      const exception = new TestError(409).toHttpException();

      expect(exception.getResponse()).toMatchObject({
        code: 'TEST_ERROR',
        message: 'Something went wrong',
      });
    });

    it('does not serialize metadata into the response body', () => {
      const driverError = {
        query: 'UPDATE "models" SET ...',
        parameters: ['secret'],
      };
      const exception = new TestError(500, {
        error: driverError,
      }).toHttpException();

      const body = JSON.stringify(exception.getResponse());
      expect(body).not.toContain('metadata');
      expect(body).not.toContain('UPDATE');
      expect(body).not.toContain('secret');
    });

    it('keeps metadata on the error instance for logging and Sentry', () => {
      const error = new TestError(500, { orgId: 'org-1' });

      expect(error.metadata).toEqual({ orgId: 'org-1' });
    });
  });
});
