import { Logger } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { HandleUnexpectedErrors } from './handle-unexpected-errors.decorator';

class ExampleApplicationError extends ApplicationError {
  constructor(error?: Error) {
    super(
      'Expected failure',
      'EXPECTED_FAILURE',
      400,
      error ? { error } : undefined,
    );
  }
}

class ExampleUnexpectedError extends ApplicationError {
  constructor(error: Error) {
    super(error.message, 'UNEXPECTED_FAILURE', 500, { error });
  }
}

// Intentionally has no `logger` property — the decorator must not depend on
// instance state.
class ExampleUseCase {
  private readonly suffix = '!';

  @HandleUnexpectedErrors(ExampleUnexpectedError)
  async execute(input: string): Promise<string> {
    if (input === 'application-error') {
      throw new ExampleApplicationError();
    }

    if (input === 'http-error') {
      throw new HttpException('Expected HTTP failure', 409);
    }

    if (input === 'unexpected-error') {
      throw new Error('Unexpected failure');
    }

    return input.toUpperCase() + this.suffix;
  }
}

class ExampleUseCaseWithDependency {
  constructor(private readonly dependency: { load(): Promise<string> }) {}

  @HandleUnexpectedErrors(ExampleUnexpectedError)
  async execute(): Promise<string> {
    return this.dependency.load();
  }
}

class DatabaseReadingUseCase {
  @HandleUnexpectedErrors(ExampleUnexpectedError, {
    databaseUnavailable: true,
  })
  async execute(error: Error): Promise<never> {
    throw error;
  }
}

class DatabaseOrchestratingUseCase {
  @HandleUnexpectedErrors(ExampleUnexpectedError, {
    databaseUnavailable: 'includingExpectedErrors',
  })
  async execute(error: Error): Promise<never> {
    throw error;
  }
}

describe('HandleUnexpectedErrors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('executes the business operation with instance state intact', async () => {
    await expect(new ExampleUseCase().execute('hello')).resolves.toBe('HELLO!');
  });

  it('preserves expected application errors', async () => {
    await expect(
      new ExampleUseCase().execute('application-error'),
    ).rejects.toBeInstanceOf(ExampleApplicationError);
  });

  it('preserves expected HTTP errors', async () => {
    await expect(new ExampleUseCase().execute('http-error')).rejects.toThrow(
      HttpException,
    );
  });

  it('logs under the class name and maps unknown errors', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(
      new ExampleUseCase().execute('unexpected-error'),
    ).rejects.toBeInstanceOf(ExampleUnexpectedError);

    expect(errorSpy).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Unexpected use-case error',
    );
  });

  it('maps non-Error rejections to the unexpected error', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    // Third-party libraries sometimes reject with plain strings
    const useCase = new ExampleUseCaseWithDependency({
      load: jest.fn().mockRejectedValue('Rejected as string'),
    });

    await expect(useCase.execute()).rejects.toMatchObject({
      constructor: ExampleUnexpectedError,
      message: 'Rejected as string',
    });
  });

  it('maps opted-in PostgreSQL outages to service unavailable', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const databaseError = Object.assign(
      new Error('the database system is in recovery mode'),
      { code: '57P03' },
    );

    await expect(
      new DatabaseReadingUseCase().execute(databaseError),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
      cause: databaseError,
    });
  });

  it('keeps unrelated failures on the module-specific error path', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(
      new DatabaseReadingUseCase().execute(new Error('programming bug')),
    ).rejects.toBeInstanceOf(ExampleUnexpectedError);
  });

  it('maps a nested module error that carries the PostgreSQL cause', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const databaseError = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });

    await expect(
      new DatabaseReadingUseCase().execute(
        new ExampleUnexpectedError(databaseError),
      ),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });

  it('preserves a typed non-database error with a connection failure', async () => {
    const connectionError = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });
    const expectedError = new ExampleApplicationError(connectionError);

    await expect(
      new DatabaseReadingUseCase().execute(expectedError),
    ).rejects.toBe(expectedError);
  });

  it('maps a nested persistence error at an orchestrating boundary', async () => {
    const databaseError = Object.assign(new Error('connection refused'), {
      code: 'ECONNREFUSED',
    });

    await expect(
      new DatabaseOrchestratingUseCase().execute(
        new ExampleApplicationError(databaseError),
      ),
    ).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
  });
});
