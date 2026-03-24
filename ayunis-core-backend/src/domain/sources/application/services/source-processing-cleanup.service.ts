import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { DocumentProcessingPort } from '../ports/document-processing.port';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class SourceProcessingCleanupService {
  private readonly logger = new Logger(SourceProcessingCleanupService.name);

  constructor(
    private readonly documentProcessingPort: DocumentProcessingPort,
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  async cancelAndCleanup(sourceId: UUID): Promise<void> {
    try {
      await this.documentProcessingPort.cancelJob(sourceId);
    } catch (err) {
      this.logger.warn('Failed to cancel processing job', {
        sourceId,
        error: err as Error,
      });
    }
    await this.cleanupProcessingFiles(sourceId);
  }

  private async cleanupProcessingFiles(sourceId: UUID): Promise<void> {
    try {
      const orgId = this.contextService.get('orgId');
      if (!orgId) return;
      const prefix = `${orgId}/processing/${sourceId}/`;
      const objects = await this.listObjectsUseCase.execute(
        new ListObjectsCommand(prefix),
      );
      for (const objectName of objects) {
        await this.deleteObjectUseCase.execute(
          new DeleteObjectCommand(objectName),
        );
      }
    } catch (err) {
      this.logger.warn('Failed to clean up MinIO processing files', {
        sourceId,
        error: err as Error,
      });
    }
  }
}
