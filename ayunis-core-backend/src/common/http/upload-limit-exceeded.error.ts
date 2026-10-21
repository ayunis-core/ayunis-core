import { ApplicationError } from 'src/common/errors/base.error';

// Same code as the generic Multer 413 mapping so clients keep one branch; the
// metadata lets them show the limit that actually applied.
export class UploadLimitExceededError extends ApplicationError {
  constructor(maxFileSizeBytes: number) {
    super(
      `File exceeds the upload limit of ${Math.round(maxFileSizeBytes / (1024 * 1024))} MB`,
      'FILE_TOO_LARGE',
      413,
      { maxFileSizeBytes },
    );
  }
}
