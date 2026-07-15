import type { ArgumentsHost } from '@nestjs/common';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { UnauthorizedExceptionFilter } from './unauthorized-exception.filter';

describe('UnauthorizedExceptionFilter', () => {
  let filter: UnauthorizedExceptionFilter;
  let response: {
    status: jest.Mock;
    json: jest.Mock;
    cookie: jest.Mock;
    setHeader: jest.Mock;
  };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new UnauthorizedExceptionFilter();

    const jsonMock = jest.fn();
    response = {
      status: jest.fn().mockReturnValue({ json: jsonMock }),
      json: jsonMock,
      cookie: jest.fn(),
      setHeader: jest.fn(),
    };

    host = {
      switchToHttp: () => ({
        getResponse: () => response as unknown as Response,
        getRequest: () => ({ cookies: {} }),
      }),
    } as unknown as ArgumentsHost;

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  it('should respond 401 with shouldRefresh:false and never issue cookies', () => {
    filter.catch(new UnauthorizedException('nope'), host);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Unauthorized',
        shouldRefresh: false,
        shouldRedirectToLogin: true,
      }),
    );
    // The filter must never mint or set session cookies (forged-cookie fix).
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});
