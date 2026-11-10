import './config/env';
import './common/process/process-crash-handlers';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, type INestApplicationContext } from '@nestjs/common';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { ingestionTopology } from 'src/common/process/ingestion-topology';
import { ingestionWorkerHealthPort } from 'src/config/ingestion.config';
import { checkIn } from '@appsignal/nodejs';

async function start(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    // Queue modules pick their consumers while they are imported, so the
    // module graph is loaded only after this process declared itself.
    ingestionTopology.declareWorker();
    const { IngestionWorkerModule } =
      await import('./app/ingestion-worker.module.js');
    const { IngestionRuntimeService } =
      await import('./app/infrastructure/ingestion-runtime.service.js');
    app = await NestFactory.createApplicationContext(IngestionWorkerModule, {
      bufferLogs: true,
    });
    installNestLogger(app);
    app.enableShutdownHooks();
    const port = await app
      .get(IngestionRuntimeService)
      .startHealthServer(ingestionWorkerHealthPort());
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
