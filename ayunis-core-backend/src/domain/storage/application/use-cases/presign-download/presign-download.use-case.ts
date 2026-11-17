import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ObjectStoragePort } from 'src/domain/storage/application/ports/object-storage.port';
import { UnexpectedStorageError } from 'src/domain/storage/application/storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { PresignDownloadCommand } from './presign-download.command';

/** The returned URL is a bearer credential: never log it. */
@Injectable()
export class PresignDownloadUseCase {
  private readonly logger = new Logger(PresignDownloadUseCase.name);

  constructor(private readonly objectStorage: ObjectStoragePort) {}

  @HandleUnexpectedErrors(UnexpectedStorageError)
  async execute(command: PresignDownloadCommand): Promise<string> {
    const { expiresInSeconds, signingWindowSeconds } = command;
    if (
      !Number.isSafeInteger(signingWindowSeconds) ||
      signingWindowSeconds < 1 ||
      signingWindowSeconds >= expiresInSeconds
    )
      throw new Error('Signing window must be shorter than the URL expiry');
    this.logger.debug({ fileName: command.objectName }, 'Signing download');
    const windowMs = signingWindowSeconds * 1000;
    return this.objectStorage.presignDownload(
      new StorageUrl(command.objectName, command.options.bucket ?? ''),
      {
        signedAt: new Date(Math.floor(Date.now() / windowMs) * windowMs),
        expiresInSeconds,
        contentType: command.options.contentType,
        fileName: command.options.fileName,
      },
    );
  }
}
