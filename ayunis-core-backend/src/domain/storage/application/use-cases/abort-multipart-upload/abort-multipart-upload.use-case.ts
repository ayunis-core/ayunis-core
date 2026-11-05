import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { UnexpectedStorageError } from 'src/domain/storage/application/storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { AbortMultipartUploadCommand } from './abort-multipart-upload.command';

@Injectable()
export class AbortMultipartUploadUseCase {
  private readonly logger = new Logger(AbortMultipartUploadUseCase.name);

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(command: AbortMultipartUploadCommand): Promise<void> {
    this.logger.debug(
      { fileName: command.objectName },
      'Aborting multipart upload',
    );
    await this.objectStorage.abortMultipartUpload(
      new StorageUrl(command.objectName, command.bucket ?? ''),
      command.uploadId,
    );
  }
}
