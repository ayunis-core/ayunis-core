import { Logger } from '@nestjs/common';
import { Appsignal, sendError } from '@appsignal/nodejs';
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
  let loggerErrorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    handlers = new ProcessCrashHandlers();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('handleUnhandledRejection', () => {
    it('logs and reports the rejection without exiting the process', () => {
      const error = new Error('db write failed');

      handlers.handleUnhandledRejection(error);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Unhandled promise rejection: db write failed',
        error.stack,
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
      loggerErrorSpy.mockImplementationOnce(() => {
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

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Uncaught exception: socket write after close',
        error.stack,
      );
      expect(sendError).toHaveBeenCalledWith(error);
      expect(stopMock).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('logs the stop failure and still exits when the AppSignal stop fails', async () => {
      stopMock.mockRejectedValueOnce(new Error('stop timeout'));

      handlers.handleUncaughtException(new Error('boom'));
      await new Promise(process.nextTick);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to stop AppSignal before shutdown: stop timeout',
        expect.any(String),
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

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Uncaught exception: null',
        expect.any(String),
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
