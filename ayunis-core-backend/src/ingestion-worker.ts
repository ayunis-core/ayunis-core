import './config/env';
import './common/process/process-crash-handlers';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, type INestApplicationContext } from '@nestjs/common';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { installHttp1GlobalDispatcher } from 'src/common/http/http1-global-dispatcher';
import { IngestionWorkerModule } from 'src/app/ingestion-worker.module';
import { QueueWorkerRuntimeService } from 'src/app/infrastructure/queue-worker-runtime.service';
import { ingestionWorkerHealthPort } from 'src/config/ingestion.config';
import { INGESTION_QUEUES } from 'src/app/ingestion-consumers.module';
import { checkIn } from '@appsignal/nodejs';

async function start(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    // OCR, embeddings and transcription run in this process; without this
    // they would negotiate HTTP/2 again (AYC-1774).
    installHttp1GlobalDispatcher();
    app = await NestFactory.createApplicationContext(IngestionWorkerModule, {
      bufferLogs: true,
    });
    installNestLogger(app);
    // In the container Node is PID 1, which ignores the SIGTERM Nest re-raises
    // after its shutdown hooks, so the process lingered until Docker killed it
    // (AYC-1267). Exit explicitly instead.
    app.enableShutdownHooks([], { useProcessExit: true });
    const port = await app
      .get(QueueWorkerRuntimeService)
      .startHealthServer(ingestionWorkerHealthPort(), INGESTION_QUEUES);
    checkIn.heartbeat('ingestion_worker_process', { continuous: true });
    new Logger('IngestionWorker').log(
      { role: 'worker', healthPort: port },
      'Ingestion worker ready',
    );
  } catch (error) {
    await app?.close();
    throw error;
  }
}

void start().catch((error: unknown) => {
  new Logger('IngestionWorker').error(
    { err: error },
    'Ingestion worker startup failed',
  );
  process.exit(1);
});
