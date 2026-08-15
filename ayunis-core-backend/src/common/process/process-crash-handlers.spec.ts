import { Appsignal, sendError } from '@appsignal/nodejs';
import { createPinoLoggerMock } from '../testing/pino-logger.mock';
import { ProcessCrashHandlers } from './process-crash-handlers';

jest.mock('@appsignal/nodejs', () => ({
  sendError: jest.fn(),
  Appsignal: {
    client: { stop: jest.fn().mockResolvedValue(undefined) },
  },
}));

const stopMock = Appsignal.client.stop as jest.Mock;

describe('ProcessCrashHandlers', () => {
  let handlers: ProcessCrashHandlers;
  const logger = createPinoLoggerMock();
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new ProcessCrashHandlers(logger);
    logger.error.mockReset();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('handleUnhandledRejection', () => {
    it('logs and reports the rejection without exiting the process', () => {
      const error = new Error('db write failed');

      handlers.handleUnhandledRejection(error);

      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        'Unhandled promise rejection',
      );
      expect(sendError).toHaveBeenCalledWith(error);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('wraps non-Error rejection reasons', () => {
      handlers.handleUnhandledRejection('plain string reason');

      expect(sendError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'plain string reason' }),
      );
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('serializes structured rejection reasons instead of "[object Object]"', () => {
      handlers.handleUnhandledRejection({ code: 'DATABASE_ERROR' });

      expect(sendError).toHaveBeenCalledWith(
        expect.objectContaining({ message: '{"code":"DATABASE_ERROR"}' }),
      );
    });

    it('still reports to AppSignal when logging fails', () => {
      logger.error.mockImplementationOnce(() => {
        throw new Error('logger transport broken');
      });
      const error = new Error('boom');

      handlers.handleUnhandledRejection(error);

      expect(sendError).toHaveBeenCalledWith(error);
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('does not escalate when reporting itself throws', () => {
      (sendError as jest.Mock).mockImplementationOnce(() => {
        throw new Error('appsignal client broken');
      });

      expect(() =>
        handlers.handleUnhandledRejection(new Error('boom')),
      ).not.toThrow();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('handleUncaughtException', () => {
    it('logs, reports, stops AppSignal, and exits with code 1', async () => {
      const error = new Error('socket write after close');

      handlers.handleUncaughtException(error);
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        { err: error },
        'Uncaught exception',
      );
      expect(sendError).toHaveBeenCalledWith(error);
      expect(stopMock).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('logs the stop failure and still exits when the AppSignal stop fails', async () => {
      stopMock.mockRejectedValueOnce(new Error('stop timeout'));

      handlers.handleUncaughtException(new Error('boom'));
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        'Failed to stop AppSignal before shutdown',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits even when reporting itself throws', async () => {
      (sendError as jest.Mock).mockImplementationOnce(() => {
        throw new Error('appsignal client broken');
      });

      handlers.handleUncaughtException(new Error('boom'));
      await new Promise(process.nextTick);

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('normalizes non-Error throw values so the crash is still reported', async () => {
      handlers.handleUncaughtException(null);
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        'Uncaught exception',
      );
      expect(sendError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'null' }),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('runs the stop-and-exit sequence only once for overlapping exceptions', async () => {
      handlers.handleUncaughtException(new Error('first'));
      handlers.handleUncaughtException(new Error('second'));
      await new Promise(process.nextTick);

      expect(stopMock).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('register', () => {
    it('registers listeners for both crash events', () => {
      const onSpy = jest.spyOn(process, 'on');

      try {
        handlers.register();

        expect(onSpy).toHaveBeenCalledWith(
          'unhandledRejection',
          handlers.handleUnhandledRejection,
        );
        expect(onSpy).toHaveBeenCalledWith(
          'uncaughtException',
          handlers.handleUncaughtException,
        );
      } finally {
        process.off('unhandledRejection', handlers.handleUnhandledRejection);
        process.off('uncaughtException', handlers.handleUncaughtException);
        onSpy.mockRestore();
      }
    });
  });
});
