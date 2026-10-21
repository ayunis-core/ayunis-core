import {
  Inject,
  Injectable,
  PayloadTooLargeException,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Observable } from 'rxjs';
import { uploadConfig } from 'src/config/upload.config';
import { SOURCE_FILE_UPLOAD_OPTIONS } from 'src/common/util/source-file-upload';
import { UploadLimitExceededError } from './upload-limit-exceeded.error';

/**
 * Multer's `limits.fileSize` is fixed per route at decoration time, before the
 * config is loaded, so the configured limit is applied by building the
 * `FileInterceptor` per request. The request body is never read past it, and
 * the 413 carries the limit that applied.
 */
@Injectable()
export class UploadLimitFileInterceptor implements NestInterceptor {
  constructor(
    @Inject(uploadConfig.KEY)
    private readonly config: ConfigType<typeof uploadConfig>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const { maxFileSizeBytes } = this.config;
    const Interceptor = FileInterceptor('file', {
      ...SOURCE_FILE_UPLOAD_OPTIONS,
      limits: { fileSize: maxFileSizeBytes },
    });
    try {
      return await new Interceptor().intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new UploadLimitExceededError(maxFileSizeBytes);
      }
      throw error;
    }
  }
}
