import type { UUID } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import axios from 'axios';
import { ApplicationError } from 'src/common/errors/base.error';
import { TooManyPagesError } from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import { ProviderServerError } from 'src/common/errors/provider.errors';
import type {
  ExtractionJobStatus,
  StartExtractionJobInput,
} from 'src/domain/sources/application/ports/document-extraction.port';
import { TERMINAL_EXTRACTION_STATES } from 'src/domain/sources/application/ports/document-extraction.port';
import { mapExtractionFailure } from 'src/domain/sources/application/util/extraction-failure.helper';
import { parseExtractionResult } from 'src/domain/sources/application/util/extraction-result.helper';
import {
  HttpDocumentExtractionAdapter,
  mapExtractionHttpError,
} from './http-document-extraction.adapter';
import { InMemoryDocumentExtractionAdapter } from './in-memory-document-extraction.adapter';

jest.mock('axios');

/**
 * The service commits its OpenAPI document and example payloads under
 * ayunis-core-extraction/contract (scripts/export_contract.py). This spec is
 * the backend side of that contract: what the adapter sends validates against
 * the service's request schemas, and what the service produces is readable by
 * the port, the failure mapping and the result parser.
 */
const CONTRACT_DIR = join(
  __dirname,
  '../../../../../../ayunis-core-extraction/contract',
);

/** The service adds timestamps the port does not read. */
type ServiceJobStatus = ExtractionJobStatus & {
  createdAt: string;
  startedAt: string | null;
  updatedAt: string;
  finishedAt: string | null;
};

const ORG_ID = '00000000-0000-0000-0000-000000000010' as UUID;
const SOURCE_ID = '00000000-0000-0000-0000-000000000001' as UUID;

interface OpenApiDocument {
  components: { schemas: Record<string, Record<string, unknown>> };
  paths: Record<string, Record<string, unknown>>;
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(join(CONTRACT_DIR, relative), 'utf8')) as T;
}

const openapi = readJson<OpenApiDocument>('openapi.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(openapi, 'openapi');

function validateAgainst(schema: string, payload: unknown): string[] {
  const validate = ajv.getSchema(`openapi#/components/schemas/${schema}`);
  if (!validate) throw new Error(`schema ${schema} missing from openapi.json`);
  return validate(payload)
    ? []
    : (validate.errors ?? []).map(
        (error) => `${error.instancePath} ${error.message ?? ''}`,
      );
}

function schemaOf(name: string): {
  properties: Record<string, unknown>;
  required: string[];
} {
  return openapi.components.schemas[name] as {
    properties: Record<string, unknown>;
    required: string[];
  };
}

function startInput(): StartExtractionJobInput {
  return {
    idempotencyKey: `v1:${SOURCE_ID}:${'9a3e'.repeat(16)}`,
    owner: { orgId: ORG_ID, sourceId: SOURCE_ID },
    input: {
      key: `${ORG_ID}/processing/${SOURCE_ID}/report.pdf`,
      sha256: '9a3e'.repeat(16),
    },
    fileName: 'report.pdf',
    declaredMimeType: 'application/pdf',
    outputKeyPrefix: `${ORG_ID}/processing/${SOURCE_ID}/extraction/`,
    options: { maxPages: 1000 },
  };
}

const http = { post: jest.fn(), get: jest.fn(), delete: jest.fn() };

describe('extraction service contract', () => {
  let adapter: HttpDocumentExtractionAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(axios.create).mockReturnValue(http as never);
    adapter = new HttpDocumentExtractionAdapter(
      {
        url: 'https://extraction:8000',
        token: undefined,
        requestTimeoutMs: 30_000,
        pollIntervalMs: 5000,
      },
      { minio: { bucket: 'ayunis' } } as never,
    );
  });

  it('exposes every endpoint the port calls', () => {
    expect(openapi.paths['/v1/jobs']).toHaveProperty('post');
    expect(openapi.paths['/v1/jobs/{job_id}']).toHaveProperty('get');
    expect(openapi.paths['/v1/jobs/{job_id}']).toHaveProperty('delete');
    expect(openapi.paths['/v1/jobs/{job_id}/result']).toHaveProperty('get');
    expect(openapi.paths['/v1/jobs/{job_id}/cancel']).toHaveProperty('post');
    expect(openapi.paths['/v1/jobs/release']).toHaveProperty('post');
  });

  it('sends a start body the service accepts', async () => {
    http.post.mockResolvedValue({
      data: readJson<ExtractionJobStatus>('examples/status-queued.json'),
    });

    await adapter.start(startInput());

    const [, body] = http.post.mock.calls[0] as [string, unknown];
    expect(validateAgainst('StartJobRequest', body)).toEqual([]);
  });

  it('sends a release body the service accepts', async () => {
    http.post.mockResolvedValue({ data: { released: 0, cancelled: 0 } });

    await adapter.releaseOwner({ orgId: ORG_ID, sourceIds: [SOURCE_ID] });
    await adapter.releaseOwner({ orgId: ORG_ID });

    for (const [, body] of http.post.mock.calls as [string, unknown][]) {
      expect(validateAgainst('ReleaseRequest', body)).toEqual([]);
    }
  });

  it('requires from the service exactly the status fields the port reads', async () => {
    const inMemory = new InMemoryDocumentExtractionAdapter();
    const status = schemaOf('JobStatus');
    const snapshot = await inMemory.start(startInput());
    const portFields = Object.keys(
      snapshot as unknown as Record<string, unknown>,
    );

    for (const field of portFields) {
      expect(status.properties).toHaveProperty(field);
      expect(status.required).toContain(field);
    }
    expect(schemaOf('JobProgress').required).toEqual(
      expect.arrayContaining([
        'pagesTotal',
        'pagesDone',
        'pagesOcr',
        'pagesText',
      ]),
    );
    expect(schemaOf('ResultRef').required).toEqual(
      expect.arrayContaining(['bucket', 'key', 'bytes', 'sha256', 'pageCount']),
    );
    expect(schemaOf('JobFailure').required).toEqual(
      expect.arrayContaining(['code', 'message', 'retryable']),
    );
  });

  it.each(
    readdirSync(join(CONTRACT_DIR, 'examples')).filter((name) =>
      name.startsWith('status-'),
    ),
  )('reads the service status example %s', (name) => {
    const example = readJson<ServiceJobStatus>(`examples/${name}`);

    expect(validateAgainst('JobStatus', example)).toEqual([]);
    expect(typeof example.jobId).toBe('string');
    expect(typeof example.attempt).toBe('number');
    expect(typeof example.restarts).toBe('number');
    expect(example.progress.pagesDone).toBeGreaterThanOrEqual(0);
    if (TERMINAL_EXTRACTION_STATES.has(example.state)) {
      expect(example.finishedAt).toEqual(expect.any(String));
    }
    if (example.state === 'succeeded') {
      expect(example.result).toMatchObject({ pageCount: expect.any(Number) });
    }
    if (example.state === 'failed') {
      expect(example.error).toMatchObject({ code: expect.any(String) });
      expect(mapExtractionFailure(example.error!, 'report.pdf')).toBeInstanceOf(
        ApplicationError,
      );
    }
  });

  it('maps the failure examples onto the backend error classes', () => {
    const retryable = readJson<ExtractionJobStatus>(
      'examples/status-failed-retryable.json',
    );
    const final = readJson<ExtractionJobStatus>(
      'examples/status-failed-final.json',
    );

    expect(mapExtractionFailure(retryable.error!)).toBeInstanceOf(
      ProviderServerError,
    );
    const tooMany = mapExtractionFailure(final.error!, 'report.pdf');
    expect(tooMany).toBeInstanceOf(TooManyPagesError);
    expect(tooMany.metadata).toMatchObject({ pageCount: 1200, maxPages: 1000 });
  });

  it.each(
    readdirSync(join(CONTRACT_DIR, 'examples')).filter((name) =>
      name.startsWith('error-'),
    ),
  )('maps the HTTP error example %s', (name) => {
    const example = readJson<{ error: { code: string; retryable: boolean } }>(
      `examples/${name}`,
    );

    expect(validateAgainst('ErrorResponse', example)).toEqual([]);
    const mapped = mapExtractionHttpError({
      message: 'Request failed',
      response: { status: 503, data: example },
    });
    expect(mapped).toBeInstanceOf(ApplicationError);
    expect(mapped).toMatchObject({ serviceCode: example.error.code });
  });

  it('parses the result example the consumer chunks', () => {
    const raw = readFileSync(join(CONTRACT_DIR, 'examples/result.json'));

    const result = parseExtractionResult(raw);

    expect(result.schemaVersion).toBe(1);
    expect(result.pages.map((page) => page.index)).toEqual([0, 1, 2, 3]);
    expect(result.pages.map((page) => page.number)).toEqual([1, 2, 3, 4]);
    expect(result.pages.map((page) => page.method)).toEqual([
      'text',
      'ocr',
      'blank',
      'text_fallback',
    ]);
    expect(result.document.warnings).toHaveLength(1);
    expect(result.document.pageCount).toBe(4);
  });
});
