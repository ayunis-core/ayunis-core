import { registerAs } from '@nestjs/config';
import { parsePositiveIntWithDefault } from 'src/common/util/number.util';

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UrlConfig {
  timeout: number;
  maxDownloadBytes: number;
}

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
