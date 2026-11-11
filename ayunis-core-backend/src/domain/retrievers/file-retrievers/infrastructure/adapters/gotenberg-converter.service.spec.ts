import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { resolve4 } from 'dns/promises';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { GotenbergConverterService } from './gotenberg-converter.service';
import { gotenbergConfig } from 'src/config/gotenberg.config';
import {
  DocumentConversionTimeoutError,
  DocumentConversionUnavailableError,
  DocumentConverterBusyError,
  FileRetrievalFailedError,
  FileTooLargeError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

jest.mock('axios');
jest.mock('dns/promises');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedResolve4 = resolve4 as unknown as jest.MockedFunction<
  (hostname: string) => Promise<string[]>
>;

// The bodies Gotenberg 8.39 really sends (pkg/modules/api/middlewares.go).
const TIME_LIMIT_BODY =
  'The request exceeded the time limit. Increase it with --api-timeout, or reduce the workload.';
const QUEUE_FULL_BODY =
  'The request queue is full. Retry shortly, or raise the limit with --chromium-max-queue-size or --libreoffice-max-queue-size.';

const SERVICE_URL = 'http://localhost:3000';
const REPLICAS = ['192.0.2.1', '192.0.2.2', '192.0.2.3'];

function convertUrlOn(host: string): string {
  const url = new URL('/forms/libreoffice/convert', SERVICE_URL);
  url.hostname = host;
  return url.toString();
}

function axiosErrorWithStatus(status: number, body?: string) {
  return {
    isAxiosError: true,
    response: {
      status,
      headers: {},
      ...(body === undefined ? {} : { data: Buffer.from(body) }),
    },
  };
}

describe('GotenbergConverterService', () => {
  let service: GotenbergConverterService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GotenbergConverterService,
        {
          provide: gotenbergConfig.KEY,
          useValue: {
            url: SERVICE_URL,
            maxConcurrentConversions: 1,
          },
        },
      ],
    }).compile();

    service = module.get(GotenbergConverterService);
    mockedResolve4.mockResolvedValue(REPLICAS.slice(0, 1));
    mockedAxios.isAxiosError.mockImplementation(
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        'isAxiosError' in error &&
        Boolean(error.isAxiosError),
    );
  });

  const convert = () =>
    service.convertToPdf(Buffer.from('docx'), 'report.docx');

  it('returns the converted PDF bytes', async () => {
    mockedAxios.post.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]).buffer,
    });

    await expect(convert()).resolves.toEqual(Buffer.from([1, 2, 3]));
  });

  // A document Gotenberg refuses is the user's file, not our converter — 422
  // keeps it out of AppSignal and stops the queue retrying an unwinnable job.
  it('classifies a 400 rejection as UnprocessableDocumentError', async () => {
    mockedAxios.post.mockRejectedValue(axiosErrorWithStatus(400));

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(UnprocessableDocumentError);
    await expect(result).rejects.toMatchObject({ statusCode: 422 });
  });

  it('classifies an oversized document as FileTooLargeError', async () => {
    mockedAxios.post.mockRejectedValue(axiosErrorWithStatus(413));

    await expect(convert()).rejects.toBeInstanceOf(FileTooLargeError);
  });

  it('keeps a 503 that is not the time limit an actionable transient failure for the queue to retry', async () => {
    mockedAxios.post.mockRejectedValue(axiosErrorWithStatus(503));

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(
      DocumentConversionUnavailableError,
    );
    await expect(result).rejects.toMatchObject({
      code: 'DOCUMENT_CONVERSION_UNAVAILABLE',
      statusCode: 503,
      message: expect.stringMatching(/try again later/i),
      metadata: { converter: 'gotenberg', upstreamStatus: 503 },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  // Retrying would hold a replica for another full time limit, so the
  // conversion settles as the document's fault without an incident (AYC-1741).
  it("reports a conversion that hit Gotenberg's time limit as a timeout of that document", async () => {
    mockedAxios.post.mockRejectedValue(
      axiosErrorWithStatus(503, TIME_LIMIT_BODY),
    );

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(DocumentConversionTimeoutError);
    await expect(result).rejects.toBeInstanceOf(UnprocessableDocumentError);
    await expect(result).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/time limit/i),
      metadata: { converter: 'gotenberg', upstreamStatus: 503 },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('converts on another replica when the first one is occupied', async () => {
    mockedResolve4.mockResolvedValue(REPLICAS.slice(0, 2));
    mockedAxios.post
      .mockRejectedValueOnce(axiosErrorWithStatus(429, QUEUE_FULL_BODY))
      .mockResolvedValueOnce({ data: new Uint8Array([7]).buffer });

    await expect(convert()).resolves.toEqual(Buffer.from([7]));
    expect(new Set(mockedAxios.post.mock.calls.map(([url]) => url))).toEqual(
      new Set(REPLICAS.slice(0, 2).map(convertUrlOn)),
    );
  });

  it('reports the converter as busy, for the queue to retry later, when every replica is occupied', async () => {
    mockedResolve4.mockResolvedValue(REPLICAS);
    mockedAxios.post.mockRejectedValue(
      axiosErrorWithStatus(429, QUEUE_FULL_BODY),
    );

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(DocumentConverterBusyError);
    await expect(result).rejects.toMatchObject({
      code: 'DOCUMENT_CONVERSION_UNAVAILABLE',
      statusCode: 503,
      metadata: { converter: 'gotenberg', upstreamStatus: 429 },
    });
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
  });

  it('uses the configured URL when its host is not a service name with replica addresses', async () => {
    mockedResolve4.mockRejectedValue(new Error('queryA ENOTFOUND localhost'));
    mockedAxios.post.mockResolvedValue({ data: new Uint8Array([1]).buffer });

    await convert();
    expect(mockedAxios.post.mock.calls[0][0]).toBe(convertUrlOn('localhost'));
  });

  it('sends the next conversion only after the one in flight has finished', async () => {
    let finishFirst!: (value: { data: ArrayBuffer }) => void;
    mockedAxios.post
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ data: new Uint8Array([2]).buffer });

    const first = convert();
    const second = convert();
    await new Promise(setImmediate);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    finishFirst({ data: new Uint8Array([1]).buffer });
    await expect(first).resolves.toEqual(Buffer.from([1]));
    await expect(second).resolves.toEqual(Buffer.from([2]));
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  // Gotenberg is our own service, so the cases below are outages we must keep
  // alerting on per occurrence — they must NOT be downgraded with the document
  // rejection above.
  it.each([
    ['an unreachable service', { isAxiosError: true }],
    ['a conversion timeout', { isAxiosError: true, code: 'ECONNABORTED' }],
    ['a gateway timeout', axiosErrorWithStatus(504)],
    ['an unexpected 5xx', axiosErrorWithStatus(500)],
  ])('keeps %s a reportable FileRetrievalFailedError', async (_, error) => {
    mockedAxios.post.mockRejectedValue(error);

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(FileRetrievalFailedError);
    await expect(result).rejects.toMatchObject({ statusCode: 500 });
  });

  // A Gotenberg 500 body is only a generic hint; the correlation id is what
  // links the failure to the cause in Gotenberg's own logs (AYC-1458).
  it('logs the Gotenberg-Trace correlation id for an unexpected status', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 500,
        headers: { 'gotenberg-trace': 'trace-123' },
      },
    });

    await expect(convert()).rejects.toBeInstanceOf(FileRetrievalFailedError);
    expect(errorSpy).toHaveBeenCalledWith(
      { fileName: 'report.docx', status: 500, gotenbergTrace: 'trace-123' },
      'Gotenberg conversion failed',
    );
  });

  it('rethrows non-axios failures untouched', async () => {
    mockedAxios.post.mockRejectedValue(new TypeError('boom'));

    await expect(convert()).rejects.toBeInstanceOf(TypeError);
  });

  describe('conversion from and to disk', () => {
    let directory: string;
    let input: string;
    let output: string;

    beforeEach(() => {
      directory = mkdtempSync(join(tmpdir(), 'gotenberg-spec-'));
      input = join(directory, 'file');
      output = join(directory, 'file.pdf');
      writeFileSync(input, 'docx bytes');
    });
    afterEach(() => {
      rmSync(directory, { recursive: true, force: true });
    });

    it('streams the upload and writes the converted PDF to the given path', async () => {
      mockedAxios.post.mockResolvedValue({
        data: Readable.from([Buffer.from('%PDF-'), Buffer.from('1.7')]),
      });

      await expect(
        service.convertFileToPdf(input, 'report.docx', output),
      ).resolves.toEqual({ size: 8 });

      expect(readFileSync(output, 'utf8')).toBe('%PDF-1.7');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        convertUrlOn(REPLICAS[0]),
        expect.anything(),
        expect.objectContaining({ responseType: 'stream' }),
      );
    });

    const occupiedReplica = (body: Readable) => ({
      isAxiosError: true,
      response: { status: 429, headers: {}, data: body },
    });

    it('converts on another replica when the first one is occupied, after reading the refusal to release its connection', async () => {
      mockedResolve4.mockResolvedValue(REPLICAS.slice(0, 2));
      const refusal = Readable.from([Buffer.from(QUEUE_FULL_BODY)]);
      mockedAxios.post
        .mockRejectedValueOnce(occupiedReplica(refusal))
        .mockResolvedValueOnce({ data: Readable.from([Buffer.from('%PDF')]) });

      await expect(
        service.convertFileToPdf(input, 'report.docx', output),
      ).resolves.toEqual({ size: 4 });

      expect(new Set(mockedAxios.post.mock.calls.map(([url]) => url))).toEqual(
        new Set(REPLICAS.slice(0, 2).map(convertUrlOn)),
      );
      expect(refusal.readableEnded).toBe(true);
    });

    it('reports the converter as busy, for the queue to retry later, when every replica is occupied', async () => {
      mockedResolve4.mockResolvedValue(REPLICAS);
      REPLICAS.forEach(() =>
        mockedAxios.post.mockRejectedValueOnce(
          occupiedReplica(Readable.from([Buffer.from(QUEUE_FULL_BODY)])),
        ),
      );

      await expect(
        service.convertFileToPdf(input, 'report.docx', output),
      ).rejects.toBeInstanceOf(DocumentConverterBusyError);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('still tells a document that ran out of conversion time from a busy converter when the error body is a stream', async () => {
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 503,
          headers: {},
          data: Readable.from([Buffer.from(TIME_LIMIT_BODY)]),
        },
      });

      await expect(
        service.convertFileToPdf(input, 'report.docx', output),
      ).rejects.toBeInstanceOf(DocumentConversionTimeoutError);
    });

    it('reports a rejected document as unprocessable', async () => {
      mockedAxios.post.mockRejectedValue(axiosErrorWithStatus(400));

      await expect(
        service.convertFileToPdf(input, 'report.docx', output),
      ).rejects.toBeInstanceOf(UnprocessableDocumentError);
    });

    it('stops waiting for an error body that never finishes and frees the conversion slot', async () => {
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
      });
      try {
        const stalled = new Readable({ read: () => undefined });
        stalled.push(Buffer.from('The request'));
        mockedAxios.post
          .mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 503, headers: {}, data: stalled },
          })
          .mockResolvedValueOnce({ data: Readable.from([Buffer.from('ok')]) });

        const stuck = service.convertFileToPdf(input, 'report.docx', output);
        const outcome = expect(stuck).rejects.toBeInstanceOf(
          DocumentConversionUnavailableError,
        );
        await new Promise((resolve) => setImmediate(resolve));
        await jest.advanceTimersByTimeAsync(10_000);
        await outcome;

        expect(stalled.destroyed).toBe(true);
        await expect(
          service.convertFileToPdf(input, 'next.docx', output),
        ).resolves.toEqual({ size: 2 });
      } finally {
        jest.useRealTimers();
      }
    });

    it('gives up on a PDF body that stops arriving and frees the conversion slot', async () => {
      jest.useFakeTimers({
        doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
      });
      try {
        const stalled = new Readable({ read: () => undefined });
        stalled.push(Buffer.from('%PDF-'));
        mockedAxios.post
          .mockResolvedValueOnce({ data: stalled })
          .mockResolvedValueOnce({ data: Readable.from([Buffer.from('ok')]) });

        const stuck = service.convertFileToPdf(input, 'report.docx', output);
        const outcome = expect(stuck).rejects.toMatchObject({
          constructor: FileRetrievalFailedError,
          message: 'Gotenberg conversion timed out for report.docx',
        });
        await new Promise((resolve) => setImmediate(resolve));
        await jest.advanceTimersByTimeAsync(10 * 60 * 1000);
        await outcome;

        expect(stalled.destroyed).toBe(true);
        await expect(
          service.convertFileToPdf(input, 'next.docx', output),
        ).resolves.toEqual({ size: 2 });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
