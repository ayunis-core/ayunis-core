import { NestFactory } from '@nestjs/core';
import { installHttp1GlobalDispatcher } from 'src/common/http/http1-global-dispatcher';

jest.mock('./config/env', () => ({}));
jest.mock('./common/process/process-crash-handlers', () => ({}));
jest.mock('src/app/ingestion-worker.module', () => ({
  IngestionWorkerModule: class {},
}));
jest.mock('src/app/ingestion-consumers.module', () => ({
  INGESTION_QUEUES: ['document-processing'],
}));
jest.mock('src/app/infrastructure/queue-worker-runtime.service', () => ({
  QueueWorkerRuntimeService: class {},
}));
jest.mock('src/common/logger/install-nest-logger', () => ({
  installNestLogger: jest.fn(),
}));
jest.mock('src/common/http/http1-global-dispatcher', () => ({
  installHttp1GlobalDispatcher: jest.fn(),
}));
jest.mock('@appsignal/nodejs', () => ({
  checkIn: { heartbeat: jest.fn() },
}));
jest.mock('@nestjs/core', () => ({
  NestFactory: { createApplicationContext: jest.fn() },
}));

describe('ingestion worker entry point', () => {
  it('sends provider calls over HTTP/1.1 before the worker boots, like the API', async () => {
    const started = new Promise<void>((resolve) => {
      jest.mocked(NestFactory.createApplicationContext).mockResolvedValue({
        enableShutdownHooks: jest.fn(),
        get: () => ({
          startHealthServer: () => {
            resolve();
            return Promise.resolve(0);
          },
        }),
      } as never);
    });

    jest.isolateModules(() => {
      jest.requireActual('./ingestion-worker');
    });
    await started;

    expect(installHttp1GlobalDispatcher).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(installHttp1GlobalDispatcher).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(NestFactory.createApplicationContext).mock
        .invocationCallOrder[0],
    );
  });
});
