import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApplicationError } from './base.error';

class TestError extends ApplicationError {
  constructor(statusCode: number) {
    super('test message', 'TEST_CODE', statusCode, { detail: 'x' });
  }
}

describe('ApplicationError.toHttpException', () => {
  it('maps a status with a dedicated factory to that exception type', () => {
    const exception = new TestError(422).toHttpException();

    expect(exception).toBeInstanceOf(UnprocessableEntityException);
    expect(exception.getStatus()).toBe(422);
  });

  it('carries code, message, and metadata in a client-error response', () => {
    const exception = new TestError(422).toHttpException();

    expect(exception.getResponse()).toEqual({
      code: 'TEST_CODE',
      message: 'test message',
      metadata: { detail: 'x' },
    });
  });

  it('does not expose the message or metadata in a server-error response', () => {
    const error = new TestError(500);

    expect(error.toHttpException().getResponse()).toEqual({
      code: 'TEST_CODE',
      message: 'Internal server error',
    });
    expect(error.message).toBe('test message');
    expect(error.metadata).toEqual({ detail: 'x' });
  });

  it('falls back to BadRequestException for an unmapped status', () => {
    const exception = new TestError(418).toHttpException();

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getStatus()).toBe(400);
  });
});
