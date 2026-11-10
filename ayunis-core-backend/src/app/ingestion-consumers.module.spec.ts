import 'reflect-metadata';
// ModelsModule first: the Models ↔ Sources import cycle resolves only in this order.
import 'src/domain/models/models.module';
import { SourcesModule } from 'src/domain/sources/sources.module';
import { IngestionWorkerModule } from 'src/app/ingestion-worker.module';
import { StaleProcessingCleanupTask } from 'src/domain/sources/infrastructure/tasks/stale-processing-cleanup.task';
import { IngestionConsumersModule } from './ingestion-consumers.module';
import { DocumentProcessingModule } from 'src/domain/sources/infrastructure/queue/document-processing.module';
import { DataSourceProcessingModule } from 'src/domain/sources/infrastructure/queue/data-source-processing.module';
import { UrlCrawlModule } from 'src/domain/sources/infrastructure/queue/url-crawl.module';
import { DocumentProcessingConsumer } from 'src/domain/sources/infrastructure/queue/document-processing.consumer';
import { LargeDocumentProcessingConsumer } from 'src/domain/sources/infrastructure/queue/large-document-processing.consumer';
import { DataSourceProcessingConsumer } from 'src/domain/sources/infrastructure/queue/data-source-processing.consumer';
import { UrlCrawlConsumer } from 'src/domain/sources/infrastructure/queue/url-crawl.consumer';

const CONSUMERS = [
  DocumentProcessingConsumer,
  LargeDocumentProcessingConsumer,
  DataSourceProcessingConsumer,
  UrlCrawlConsumer,
];

function metadata(module: object, key: 'providers' | 'imports'): unknown[] {
  return (Reflect.getMetadata(key, module) as unknown[] | undefined) ?? [];
}

describe('ingestion consumer ownership', () => {
  it('keeps the consumers out of the modules a process imports to enqueue', () => {
    for (const module of [
      DocumentProcessingModule,
      DataSourceProcessingModule,
      UrlCrawlModule,
      SourcesModule,
    ]) {
      const providers = metadata(module, 'providers');
      expect(CONSUMERS.some((consumer) => providers.includes(consumer))).toBe(
        false,
      );
    }
  });

  it('registers every consumer exactly once, in the consumers module', () => {
    const providers = metadata(IngestionConsumersModule, 'providers');
    for (const consumer of CONSUMERS) {
      expect(
        providers.filter((provider) => provider === consumer),
      ).toHaveLength(1);
    }
  });

  it('gives the worker the consumers and leaves scheduled cleanup with the API', () => {
    expect(metadata(IngestionWorkerModule, 'imports')).toContain(
      IngestionConsumersModule,
    );
    expect(metadata(IngestionConsumersModule, 'providers')).not.toContain(
      StaleProcessingCleanupTask,
    );
    expect(metadata(SourcesModule, 'providers')).toContain(
      StaleProcessingCleanupTask,
    );
  });
});
