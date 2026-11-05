import './config/worker-env';
import './common/process/process-crash-handlers';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, type INestApplicationContext } from '@nestjs/common';
import { installNestLogger } from 'src/common/logger/install-nest-logger';
import { IngestionWorkerModule } from 'src/app/ingestion-worker.module';
import { IngestionRuntimeService } from 'src/app/infrastructure/ingestion-runtime.service';
import { checkIn } from '@appsignal/nodejs';

async function start(): Promise<void> {
  let app: INestApplicationContext | undefined;
  try {
    app = await NestFactory.createApplicationContext(IngestionWorkerModule, {
      bufferLogs: true,
    });
    installNestLogger(app);
    app.enableShutdownHooks();
    const port = await app
      .get(IngestionRuntimeService)
      .startHealthServer(Number(process.env.WORKER_HEALTH_PORT ?? 3001));
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
