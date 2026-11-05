import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import type { IncompleteUpload } from 'src/domain/storage/domain/multipart-upload.object';
import { UnexpectedStorageError } from 'src/domain/storage/application/storage.errors';
import { ListIncompleteUploadsCommand } from './list-incomplete-uploads.command';

@Injectable()
export class ListIncompleteUploadsUseCase {
  private readonly logger = new Logger(ListIncompleteUploadsUseCase.name);

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(
    command: ListIncompleteUploadsCommand,
  ): Promise<IncompleteUpload[]> {
    this.logger.debug({ prefix: command.prefix }, 'Listing incomplete uploads');
    return this.objectStorage.listIncompleteUploads(
      command.prefix,
      command.bucket,
    );
  }
}
