import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { GotenbergConverterService } from './gotenberg-converter.service';
import { gotenbergConfig } from 'src/config/gotenberg.config';
import {
  DocumentConversionTimeoutError,
  DocumentConversionUnavailableError,
  FileRetrievalFailedError,
  FileTooLargeError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

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
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GotenbergConverterService,
        {
          provide: gotenbergConfig.KEY,
          useValue: {
            url: 'https://gotenberg:3000',
            maxConcurrentConversions: 1,
          },
        },
      ],
    }).compile();

    service = module.get(GotenbergConverterService);
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

  it('classifies a 503 as an actionable transient conversion failure for the queue to retry', async () => {
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

  // LibreOffice ran out of time on this document itself: retrying would hold
  // the converter for another full time limit, so it settles as the document's
  // fault without an incident (AYC-1641).
  it("classifies a 503 whose body reports the conversion timing out as the document's fault", async () => {
    mockedAxios.post.mockRejectedValue(
      axiosErrorWithStatus(
        503,
        '{"error":"convert to PDF: supervisor run task: context deadline exceeded"}',
      ),
    );

    const result = convert();
    await expect(result).rejects.toBeInstanceOf(DocumentConversionTimeoutError);
    await expect(result).rejects.toBeInstanceOf(UnprocessableDocumentError);
    await expect(result).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/time limit/i),
      metadata: { converter: 'gotenberg', upstreamStatus: 503 },
    });
  });

  // The request only waited for the LibreOffice lock behind another document
  // and never got its turn, so a spaced retry can still succeed.
  it('keeps a 503 that timed out waiting for the LibreOffice lock retryable', async () => {
    mockedAxios.post.mockRejectedValue(
      axiosErrorWithStatus(
        503,
        'convert to PDF: supervisor run task: acquire process lock: context deadline exceeded',
      ),
    );

    await expect(convert()).rejects.toBeInstanceOf(
      DocumentConversionUnavailableError,
    );
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
    await Promise.resolve();
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
});
