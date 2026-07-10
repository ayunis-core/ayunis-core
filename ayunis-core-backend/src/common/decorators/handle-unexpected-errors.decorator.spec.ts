import { HttpException, Logger } from '@nestjs/common';
import { ApplicationError } from '../errors/base.error';
import { HandleUnexpectedErrors } from './handle-unexpected-errors.decorator';

class ExampleApplicationError extends ApplicationError {
  constructor() {
    super('Expected failure', 'EXPECTED_FAILURE', 400);
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
      'Unexpected use-case error',
      expect.any(String),
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
});
