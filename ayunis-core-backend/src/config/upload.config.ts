import { registerAs } from '@nestjs/config';
import { parsePositiveIntWithDefault } from 'src/common/util/number.util';
import { DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES } from 'src/common/util/source-file-upload';

export interface UploadConfig {
  /** Largest file accepted on every source upload surface. */
  maxFileSizeBytes: number;
}

// The ceiling (`MAX_SOURCE_FILE_SIZE_LIMIT_BYTES`) is enforced by env validation
// at boot, so an oversized value fails loudly instead of being clamped here.
export const uploadConfig = registerAs('upload', (): UploadConfig => ({
  maxFileSizeBytes: parsePositiveIntWithDefault(
    process.env.UPLOAD_MAX_FILE_SIZE_BYTES,
    DEFAULT_SOURCE_FILE_SIZE_LIMIT_BYTES,
  ),
}));
