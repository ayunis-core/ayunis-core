import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { extractUpstreamStatus } from 'src/common/errors/extract-upstream-status.helper';
import { wrapProviderFailure } from 'src/common/errors/wrap-provider-failure.helper';
import {
  type ExtractionConfig,
  extractionConfig,
} from 'src/config/extraction.config';
import storageConfig from 'src/config/storage.config';
import {
  DocumentExtractionPort,
  type ExtractionJobFailure,
  type ExtractionJobStatus,
  type ExtractionResultRef,
  type ReleaseExtractionJobsInput,
  type ReleaseExtractionJobsOutcome,
  type StartExtractionJobInput,
} from 'src/domain/sources/application/ports/document-extraction.port';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import { mapExtractionFailure } from 'src/domain/sources/application/util/extraction-failure.helper';

const PROVIDER = 'extraction';

/** Reads the contract's `{ error: { code, message, retryable } }` body off a failed response. */
function serviceFailureOf(error: unknown): ExtractionJobFailure | undefined {
  const body = (error as { response?: { data?: unknown } } | null)?.response
    ?.data;
  const failure = (body as { error?: unknown } | null)?.error;
  if (
    typeof failure !== 'object' ||
    failure === null ||
    typeof (failure as { code?: unknown }).code !== 'string'
  ) {
    return undefined;
  }
  const { code, message, retryable, details } = failure as {
    code: string;
    message?: unknown;
    retryable?: unknown;
    details?: unknown;
  };
  return {
    code,
    message: typeof message === 'string' ? message : code,
    retryable: retryable === true,
    ...(typeof details === 'object' &&
      details !== null && { details: details as Record<string, unknown> }),
  };
}

/**
 * A response the service answered maps per contract §10; anything the
 * transport produced goes through the shared provider taxonomy so an
 * unreachable service alerts like Gotenberg or Mistral being down. A 4xx
 * without a contract body (a framework 401 for a bad token, a 404 for a
 * wrong URL) is a configuration fault: it settles and alerts once instead
 * of being retried as an outage.
 */
export function mapExtractionHttpError(error: unknown): Error {
  const failure = serviceFailureOf(error);
  if (failure) return mapExtractionFailure(failure);
  const providerFailure = wrapProviderFailure(error, { provider: PROVIDER });
  if (providerFailure) return providerFailure;
  const message = error instanceof Error ? error.message : String(error);
  const status = extractUpstreamStatus(error);
  if (status !== undefined && status < 500) {
    return new DocumentExtractionFailedError(`HTTP_${status}`, message, false, {
      upstreamStatus: status,
    });
  }
  return new DocumentExtractionFailedError('TRANSPORT', message, true);
}

@Injectable()
export class HttpDocumentExtractionAdapter extends DocumentExtractionPort {
  private readonly logger = new Logger(HttpDocumentExtractionAdapter.name);
  private readonly http: AxiosInstance;
  private readonly bucket: string;

  constructor(
    @Inject(extractionConfig.KEY) config: ExtractionConfig,
    @Inject(storageConfig.KEY) storage: ConfigType<typeof storageConfig>,
  ) {
    super();
    this.bucket = storage.minio.bucket;
    this.http = axios.create({
      baseURL: `${config.url ?? ''}/v1`,
      timeout: config.requestTimeoutMs,
      // Without this an axios deadline reports as ECONNABORTED, which the
      // transport classifier files as a connection failure.
      transitional: { clarifyTimeoutError: true },
      headers: {
        'Content-Type': 'application/json',
        ...(config.token && { Authorization: `Bearer ${config.token}` }),
      },
    });
  }

  async start(input: StartExtractionJobInput): Promise<ExtractionJobStatus> {
    const status = await this.send(() =>
      this.http.post<ExtractionJobStatus>('/jobs', {
        idempotencyKey: input.idempotencyKey,
        owner: input.owner,
        input: { bucket: this.bucket, ...input.input },
        fileName: input.fileName,
        declaredMimeType: input.declaredMimeType,
        output: { bucket: this.bucket, keyPrefix: input.outputKeyPrefix },
        ...(input.options && { options: input.options }),
      }),
    );
    this.logger.log(
      {
        sourceId: input.owner.sourceId,
        jobId: status.jobId,
        state: status.state,
        attempt: status.attempt,
      },
      'Extraction job started or reconnected',
    );
    return status;
  }

  status(jobId: string): Promise<ExtractionJobStatus> {
    return this.send(() =>
      this.http.get<ExtractionJobStatus>(`/jobs/${encodeURIComponent(jobId)}`),
    );
  }

  result(jobId: string): Promise<ExtractionResultRef> {
    return this.send(() =>
      this.http.get<ExtractionResultRef>(
        `/jobs/${encodeURIComponent(jobId)}/result`,
      ),
    );
  }

  cancel(jobId: string): Promise<ExtractionJobStatus> {
    return this.send(() =>
      this.http.post<ExtractionJobStatus>(
        `/jobs/${encodeURIComponent(jobId)}/cancel`,
      ),
    );
  }

  async release(jobId: string): Promise<void> {
    await this.send(() =>
      this.http.delete<void>(`/jobs/${encodeURIComponent(jobId)}`),
    );
  }

  releaseOwner(
    input: ReleaseExtractionJobsInput,
  ): Promise<ReleaseExtractionJobsOutcome> {
    return this.send(() =>
      this.http.post<ReleaseExtractionJobsOutcome>('/jobs/release', {
        orgId: input.orgId,
        ...(input.sourceIds && { sourceIds: input.sourceIds }),
      }),
    );
  }

  private async send<T>(request: () => Promise<AxiosResponse<T>>): Promise<T> {
    try {
      return (await request()).data;
    } catch (error) {
      throw mapExtractionHttpError(error);
    }
  }
}
