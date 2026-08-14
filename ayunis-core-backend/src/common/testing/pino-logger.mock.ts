import type { PinoLogger } from 'nestjs-pino';

export function createPinoLoggerMock(): jest.Mocked<PinoLogger> {
  return {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    setContext: jest.fn(),
    assign: jest.fn(),
  } as unknown as jest.Mocked<PinoLogger>;
}
