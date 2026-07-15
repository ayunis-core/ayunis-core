import { registerAs } from '@nestjs/config';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UrlConfig {
  timeout: number;
  maxDownloadBytes: number;
}

// Both settings are positive byte/millisecond counts. A zero, negative, or
// non-numeric value would silently disable the retriever (a 0-byte cap rejects
// every response; a 0ms timeout aborts every fetch), so fall back to the
// default rather than honoring a nonsensical override.
const parsePositiveIntWithDefault = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const urlConfig = registerAs('url', (): UrlConfig => ({
  timeout: parsePositiveIntWithDefault(
    process.env.URL_RETRIEVER_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  ),
  maxDownloadBytes: parsePositiveIntWithDefault(
    process.env.URL_RETRIEVER_MAX_DOWNLOAD_BYTES,
    DEFAULT_MAX_DOWNLOAD_BYTES,
  ),
}));
