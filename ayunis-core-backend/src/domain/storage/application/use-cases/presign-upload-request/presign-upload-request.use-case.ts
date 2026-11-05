import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { UnexpectedStorageError } from 'src/domain/storage/application/storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { PresignUploadRequestCommand } from './presign-upload-request.command';

@Injectable()
export class PresignUploadRequestUseCase {
  private readonly logger = new Logger(PresignUploadRequestUseCase.name);

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(command: PresignUploadRequestCommand): Promise<string> {
    this.logger.debug(
      { fileName: command.objectName, method: command.request.method },
      'Signing upload request',
    );
    return this.objectStorage.presignUploadRequest(
      new StorageUrl(command.objectName, command.bucket ?? ''),
      command.request,
      command.expiresInSeconds,
    );
  }
}
