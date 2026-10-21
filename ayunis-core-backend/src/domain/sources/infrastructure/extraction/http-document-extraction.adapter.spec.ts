import type { UUID } from 'crypto';
import axios from 'axios';
import {
  ProviderConnectionError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { DocumentExtractionFailedError } from 'src/domain/sources/application/sources.errors';
import {
  HttpDocumentExtractionAdapter,
  mapExtractionHttpError,
} from './http-document-extraction.adapter';

jest.mock('axios');

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

const http = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

function withStatus(status: number, data?: unknown) {
  return {
    message: `Request failed with status code ${status}`,
    response: { status, data },
  };
}

describe(HttpDocumentExtractionAdapter.name, () => {
  let adapter: HttpDocumentExtractionAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.create).mockReturnValue(http as never);
    adapter = new HttpDocumentExtractionAdapter(
      {
        url: 'https://extraction:8000',
        token: 'secret',
        requestTimeoutMs: 30_000,
        pollIntervalMs: 5000,
      },
      { minio: { bucket: 'ayunis' } } as never,
    );
  });

  it('configures the client with the versioned base URL and bearer token', () => {
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://extraction:8000/v1',
        timeout: 30_000,
        headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
      }),
    );
  });

  it('starts a job with the contract body, filling in the bucket', async () => {
    const status = { jobId: 'j1', state: 'queued' };
    http.post.mockResolvedValue({ data: status });

    await expect(
      adapter.start({
        idempotencyKey: `v1:${SOURCE_ID}:abc`,
        owner: { orgId: ORG_ID, sourceId: SOURCE_ID },
        input: { key: 'org/processing/src/a.pdf', sha256: 'abc' },
        fileName: 'a.pdf',
        declaredMimeType: 'application/pdf',
        outputKeyPrefix: 'org/processing/src/extraction/',
        options: { maxPages: 1000 },
      }),
    ).resolves.toEqual(status);

    expect(http.post).toHaveBeenCalledWith('/jobs', {
      idempotencyKey: `v1:${SOURCE_ID}:abc`,
      owner: { orgId: ORG_ID, sourceId: SOURCE_ID },
      input: {
        bucket: 'ayunis',
        key: 'org/processing/src/a.pdf',
        sha256: 'abc',
      },
      fileName: 'a.pdf',
      declaredMimeType: 'application/pdf',
      output: { bucket: 'ayunis', keyPrefix: 'org/processing/src/extraction/' },
      options: { maxPages: 1000 },
    });
  });

  it('addresses status, result, cancel and release by job id', async () => {
    http.get.mockResolvedValue({ data: { ok: true } });
    http.post.mockResolvedValue({ data: { ok: true } });
    http.delete.mockResolvedValue({ data: undefined });

    await adapter.status('a/b');
    await adapter.result('a/b');
    await adapter.cancel('a/b');
    await adapter.release('a/b');
    await adapter.releaseOwner({ orgId: ORG_ID, sourceIds: [SOURCE_ID] });

    expect(http.get).toHaveBeenCalledWith('/jobs/a%2Fb');
    expect(http.get).toHaveBeenCalledWith('/jobs/a%2Fb/result');
    expect(http.post).toHaveBeenCalledWith('/jobs/a%2Fb/cancel');
    expect(http.delete).toHaveBeenCalledWith('/jobs/a%2Fb');
    expect(http.post).toHaveBeenCalledWith('/jobs/release', {
      orgId: ORG_ID,
      sourceIds: [SOURCE_ID],
    });
  });

  it('maps a service error body through the contract mapping', async () => {
    http.post.mockRejectedValue(
      withStatus(409, {
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'key exists with other input',
          retryable: false,
        },
      }),
    );

    await expect(adapter.cancel('j1')).rejects.toMatchObject({
      serviceCode: 'IDEMPOTENCY_CONFLICT',
      statusCode: 500,
    });
  });
});

describe('mapExtractionHttpError', () => {
  it('turns a failed job body into the matching document error', () => {
    const error = mapExtractionHttpError(
      withStatus(400, {
        error: {
          code: 'TOO_MANY_PAGES',
          message: 'too many',
          retryable: false,
        },
      }),
    );
    expect(error).toBeInstanceOf(TooManyPagesError);
  });

  it('classifies an unreachable service as a provider connection failure', () => {
    const error = mapExtractionHttpError({
      message: 'connect ECONNREFUSED',
      code: 'ECONNREFUSED',
    });
    expect(error).toBeInstanceOf(ProviderConnectionError);
    expect(error.name).toBe('PROVIDER_UNAVAILABLE_CONNECTION_EXTRACTION');
  });

  it('classifies a client deadline as a provider timeout', () => {
    const error = mapExtractionHttpError({
      message: 'timeout of 30000ms exceeded',
      code: 'ETIMEDOUT',
    });
    expect(error).toBeInstanceOf(ProviderTimeoutError);
  });

  it('classifies a 5xx without a contract body as a provider server error', () => {
    const error = mapExtractionHttpError(withStatus(502, '<html>bad gateway'));
    expect(error).toBeInstanceOf(ProviderServerError);
  });

  it('settles a 4xx without a contract body as a configuration fault, not an outage', () => {
    const error = mapExtractionHttpError(
      withStatus(401, { detail: 'Not authenticated' }),
    );
    expect(error).toBeInstanceOf(DocumentExtractionFailedError);
    expect(error).toMatchObject({
      serviceCode: 'HTTP_401',
      retryable: false,
      statusCode: 500,
    });
  });

  it('falls back to a retryable extraction failure for anything else', () => {
    const error = mapExtractionHttpError(new Error('socket hang up'));
    expect(error).toBeInstanceOf(DocumentExtractionFailedError);
    expect((error as DocumentExtractionFailedError).statusCode).toBe(503);
  });
});
