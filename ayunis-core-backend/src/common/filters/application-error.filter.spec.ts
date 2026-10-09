import { InternalServerErrorException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ServiceUnavailableError } from 'src/common/errors/service-unavailable.error';
import { ApplicationErrorFilter } from './application-error.filter';

jest.mock('@appsignal/nodejs', () => ({ setError: jest.fn() }));

class LeakyServerError extends ApplicationError {
  constructor() {
    super('database password rejected', 'LEAKY_SERVER_ERROR', 500, {
      connectionString: 'postgres://user:secret@database/internal',
    });
  }

  override toHttpException() {
    return new InternalServerErrorException({
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    });
  }
}

describe('ApplicationErrorFilter', () => {
  it('uses the safe client response for server errors', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/models' }),
      }),
    } as unknown as ArgumentsHost;

    new ApplicationErrorFilter().catch(new LeakyServerError(), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: 'LEAKY_SERVER_ERROR',
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/api/models',
    });
  });

  it('renders database outages as a 503 response with a stable code', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/api/auth/login' }),
      }),
    } as unknown as ArgumentsHost;

    new ApplicationErrorFilter().catch(
      new ServiceUnavailableError(
        Object.assign(new Error('database is in recovery mode'), {
          code: '57P03',
        }),
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Internal server error',
      timestamp: expect.any(String),
      path: '/api/auth/login',
    });
  });
});
