import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ObjectStoragePort } from '../../ports/object-storage.port';
import { DownloadObjectCommand } from './download-object.command';
import storageConfig from 'src/config/storage.config';
import { DownloadFailedError, ObjectNotFoundError } from '../../storage.errors';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import retryWithBackoff from 'src/common/util/retryWithBackoff';

/**
 * Transient network faults between the backend and object storage — a DNS
 * blip, a reset keep-alive socket. Worth one more attempt; anything else
 * (missing key, bad credentials, permanent DNS failure) is not.
 */
const TRANSIENT_NETWORK_CODES = new Set([
  'EAI_AGAIN',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
]);

/**
 * Deliberately far below retryWithBackoff's 5s default: a browser is blocking
 * on this response, so the whole retry budget has to stay imperceptible.
 */
const RETRY_DELAY_MS = 150;
const MAX_RETRIES = 2;

function isTransientNetworkError(error: Error): boolean {
  const { code } = error as NodeJS.ErrnoException;
  return code !== undefined && TRANSIENT_NETWORK_CODES.has(code);
}

@Injectable()
export class DownloadObjectUseCase {
  private readonly logger = new Logger(DownloadObjectUseCase.name);

  constructor(
    private readonly objectStorage: ObjectStoragePort,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async execute(
    command: DownloadObjectCommand,
  ): Promise<NodeJS.ReadableStream> {
    this.logger.debug(`Downloading object: ${command.objectName}`, {
      bucket: command.bucket,
    });

    try {
      const bucketName = command.bucket || this.getDefaultBucket();

      // No exists() pre-check: it doubled the DNS lookups and round-trips on
      // the hot path for an answer the download itself already gives — the
      // storage adapter maps a missing key to ObjectNotFoundError.
      const stream = await retryWithBackoff({
        fn: () =>
          this.objectStorage.download(
            new StorageUrl(command.objectName, bucketName),
          ),
        maxRetries: MAX_RETRIES,
        delay: RETRY_DELAY_MS,
        retryIfError: isTransientNetworkError,
      });

      this.logger.debug(
        `Successfully started download for object: ${command.objectName}`,
      );

      return stream;
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }

      this.logger.error(
        `Failed to download object: ${command.objectName}`,
        error,
      );
      throw new DownloadFailedError();
    }
  }

  private getDefaultBucket(): string {
    return this.config.minio.bucket;
  }
}
