import { registerAs } from '@nestjs/config';

const DEFAULT_PDF_MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// validateEnv rejects a PDF_MAX_UPLOAD_BYTES that is not a positive integer
// at boot; an unparsable value here would compare false against every file
// size and silently remove the limit.
export default registerAs('sourceUpload', () => ({
  pdfMaxBytes: Number(
    process.env.PDF_MAX_UPLOAD_BYTES || DEFAULT_PDF_MAX_UPLOAD_BYTES,
  ),
}));
