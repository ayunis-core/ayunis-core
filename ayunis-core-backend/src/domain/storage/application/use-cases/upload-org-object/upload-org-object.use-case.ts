import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  ObjectNotFoundError,
  UnexpectedStorageError,
} from 'src/domain/storage/application/storage.errors';
import { DeleteObjectCommand } from 'src/domain/storage/application/use-cases/delete-object/delete-object.command';
import { DeleteObjectUseCase } from 'src/domain/storage/application/use-cases/delete-object/delete-object.use-case';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import type { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { AssertOrgActiveUseCase } from 'src/iam/orgs/application/use-cases/assert-org-active/assert-org-active.use-case';
import { UploadOrgObjectCommand } from './upload-org-object.command';

@Injectable()
export class UploadOrgObjectUseCase {
  private readonly logger = new Logger(UploadOrgObjectUseCase.name);

  constructor(
    private readonly assertOrgActive: AssertOrgActiveUseCase,
    private readonly uploadObject: UploadObjectUseCase,
    private readonly deleteObject: DeleteObjectUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(command: UploadOrgObjectCommand): Promise<StorageObject> {
    const org = await this.assertOrgActive.execute({ orgId: command.orgId });
    const stored = await this.uploadObject.execute(command);

    try {
      await this.assertOrgActive.execute({
        orgId: command.orgId,
        sessionVersion: org.sessionVersion,
      });
    } catch (error) {
      await this.removeLateObject(command);
      throw error;
    }

    return stored;
  }

  private async removeLateObject(
    command: UploadOrgObjectCommand,
  ): Promise<void> {
    try {
      await this.deleteObject.execute(
        new DeleteObjectCommand(command.objectName, command.bucket),
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return;
      this.logger.error(
        {
          err: error as Error,
          orgId: command.orgId,
          fileName: command.objectName,
        },
        'Failed to remove object uploaded during an organisation lifecycle change',
      );
    }
  }
}
