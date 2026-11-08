import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  InvalidObjectNameError,
  UnexpectedStorageError,
} from 'src/domain/storage/application/storage.errors';
import { UploadObjectUseCase } from 'src/domain/storage/application/use-cases/upload-object/upload-object.use-case';
import { extractOrgIdFromKey } from 'src/domain/storage/domain/org-storage-layout';
import type { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { UploadSystemObjectCommand } from './upload-system-object.command';

/**
 * Uploads an object that belongs to no organisation. Its key must lie outside
 * every org-scoped layout, or the org purge and the orphan sweep would delete
 * it as an org's blob.
 */
@Injectable()
export class UploadSystemObjectUseCase {
  private readonly logger = new Logger(UploadSystemObjectUseCase.name);

  constructor(private readonly uploadObject: UploadObjectUseCase) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(command: UploadSystemObjectCommand): Promise<StorageObject> {
    this.logger.log(
      { fileName: command.objectName },
      'Uploading system object',
    );
    if (extractOrgIdFromKey(command.objectName) !== null) {
      throw new InvalidObjectNameError({
        objectName: command.objectName,
        metadata: { reason: 'key lies in an organisation layout' },
      });
    }
    return this.uploadObject.execute(command);
  }
}
