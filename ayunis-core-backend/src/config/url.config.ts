import { registerAs } from '@nestjs/config';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UrlConfig {
  timeout: number;
  maxDownloadBytes: number;
}

const parseIntWithDefault = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const parsed = parseInt(value || String(defaultValue), 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export const urlConfig = registerAs(
  'url',
  (): UrlConfig => ({
    timeout: parseIntWithDefault(
      process.env.URL_RETRIEVER_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
    ),
    maxDownloadBytes: parseIntWithDefault(
      process.env.URL_RETRIEVER_MAX_DOWNLOAD_BYTES,
      DEFAULT_MAX_DOWNLOAD_BYTES,
    ),
  }),
);
