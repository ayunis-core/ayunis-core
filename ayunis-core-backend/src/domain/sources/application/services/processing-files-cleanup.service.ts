import { Injectable, Logger } from '@nestjs/common';
import { ListObjectsUseCase } from 'src/domain/storage/application/use-cases/list-objects/list-objects.use-case';
import { ListObjectsCommand } from 'src/domain/storage/application/use-cases/list-objects/list-objects.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { ContextService } from 'src/common/context/services/context.service';

@Injectable()
export class ProcessingFilesCleanupService {
  private readonly logger = new Logger(ProcessingFilesCleanupService.name);

  constructor(
    private readonly listObjectsUseCase: ListObjectsUseCase,
    private readonly deleteObjectUseCase: DeleteObjectUseCase,
    private readonly contextService: ContextService,
  ) {}

  async cleanup(sourceId: string): Promise<void> {
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
