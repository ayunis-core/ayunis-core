import { registerAs } from '@nestjs/config';

export interface ExtractionConfig {
  /** Unset keeps document extraction inside the API process. */
  url: string | undefined;
  /** Shared bearer token the service checks when it is configured with one. */
  token: string | undefined;
  /** Deadline for the short control calls (start, status, cancel, release). */
  requestTimeoutMs: number;
  /** Longest pause between two status polls of a running job. */
  pollIntervalMs: number;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function withoutTrailingSlash(url: string | undefined): string | undefined {
  let trimmed = url;
  while (trimmed?.endsWith('/')) trimmed = trimmed.slice(0, -1);
  return trimmed;
}

export const extractionConfig = registerAs(
  'extraction',
  (): ExtractionConfig => ({
    url: withoutTrailingSlash(optionalEnv('EXTRACTION_SERVICE_URL')),
    token: optionalEnv('EXTRACTION_SERVICE_TOKEN'),
    requestTimeoutMs: 30_000,
    pollIntervalMs: parseInt(
      process.env.EXTRACTION_POLL_INTERVAL_MS || '5000',
      10,
    ),
  }),
);
