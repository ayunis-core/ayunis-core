import { createHash } from 'crypto';
import { detectFileType } from 'src/common/util/file-type';
import {
  TooManyPagesError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { PreflightCheckUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/preflight-check/preflight-check.use-case';
import type { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import type { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';
import type { OparlPendingFile } from 'src/domain/oparl/application/models/oparl-document';
import type { OparlClientPort } from 'src/domain/oparl/application/ports/oparl-client.port';
import {
  OparlFileTooLargeError,
  OparlRequestFailedError,
} from 'src/domain/oparl/application/oparl.errors';
import { OparlFileTextReader } from './oparl-file-text-reader.service';

const URL =
  'https://rim.ekom21.de/aarbergen/webservice/oparl/v1.1/body/1/files/abc/Beschlussvorlage_VL-90-2019.pdf';
const PDF = Buffer.from('%PDF-1.7 Beschlussvorlage');
const PDF_HASH = createHash('sha256').update(PDF).digest('hex');

function pendingFile(
  overrides: Partial<OparlPendingFile> = {},
): OparlPendingFile {
  return {
    id: '7d1c3a52-0f7e-4c1b-9a51-2f2a2d0e9b11',
    bodyId: '2b5f0c1e-8d4a-4e3b-a1f2-6c7d8e9f0a1b',
    name: 'Beschlussvorlage',
    fileName: null,
    mimeType: 'application/pdf',
    accessUrl: URL,
    downloadUrl: null,
    size: null,
    fingerprint: 'fingerprint',
    previous: null,
    ...overrides,
  };
}

function setup() {
  const client = {
    downloadFile: jest
      .fn()
      .mockResolvedValue({ data: PDF, contentType: 'application/pdf' }),
  };
  const retrieve = {
    execute: jest
      .fn()
      .mockResolvedValue(
        new FileRetrieverResult([
          new FileRetrieverPage('Aufhebung der Straßenbeitragssatzung', 1),
        ]),
      ),
  };
  const preflight = { execute: jest.fn().mockResolvedValue(undefined) };
  const reader = new OparlFileTextReader(
    client as unknown as OparlClientPort,
    retrieve as unknown as RetrieveFileContentUseCase,
    preflight as unknown as PreflightCheckUseCase,
  );
  return { reader, client, retrieve, preflight };
}

const signal = new AbortController().signal;

describe('OparlFileTextReader', () => {
  it('extracts a file page by page with its content hash, on behalf of the platform', async () => {
    const { reader, retrieve } = setup();

    await expect(reader.read(pendingFile(), signal)).resolves.toEqual({
      status: OparlFileTextStatus.EXTRACTED,
      contentHash: PDF_HASH,
      pages: [{ number: 1, text: 'Aufhebung der Straßenbeitragssatzung' }],
    });
    expect(retrieve.execute.mock.calls[0][0]).toMatchObject({
      fileName: 'Beschlussvorlage_VL-90-2019.pdf',
      pdfTextLayerFirst: true,
      onBehalfOfPlatform: true,
    });
  });

  it('does not extract a file again whose bytes did not change', async () => {
    const { reader, retrieve } = setup();
    const file = pendingFile({
      previous: {
        status: OparlFileTextStatus.EXTRACTED,
        contentHash: PDF_HASH,
      },
    });

    await expect(reader.read(file, signal)).resolves.toBe('unchanged');
    expect(retrieve.execute).not.toHaveBeenCalled();
  });

  it.each([
    [
      'declares a size beyond the upload limit',
      { size: 30 * 1024 * 1024 },
      OparlFileSkipReason.TOO_LARGE,
    ],
    [
      'is of a type whose text is not read',
      { mimeType: 'audio/mpeg' },
      OparlFileSkipReason.UNSUPPORTED_TYPE,
    ],
  ])(
    'keeps a file that %s as metadata, without downloading it',
    async (_case, overrides: Partial<OparlPendingFile>, reason) => {
      const { reader, client } = setup();

      await expect(
        reader.read(pendingFile(overrides), signal),
      ).resolves.toMatchObject({ status: OparlFileTextStatus.SKIPPED, reason });
      expect(client.downloadFile).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'a MIME type with parameters and no extension',
      { mimeType: 'Text/HTML; charset=utf-8', accessUrl: `${URL}/html` },
      'text/html',
      'html',
    ],
    [
      'only the download naming its type',
      { mimeType: null, accessUrl: `${URL}/download` },
      'application/pdf',
      'pdf',
    ],
    [
      'a plain-text MIME type and no extension',
      { mimeType: 'text/plain', accessUrl: `${URL}/text` },
      'text/plain',
      'txt',
    ],
  ])(
    'hands the retriever a file with %s as the type it is',
    async (_case, overrides: Partial<OparlPendingFile>, contentType, type) => {
      const { reader, client, retrieve } = setup();
      client.downloadFile.mockResolvedValue({ data: PDF, contentType });

      await expect(
        reader.read(pendingFile(overrides), signal),
      ).resolves.toMatchObject({ status: OparlFileTextStatus.EXTRACTED });
      const sent = retrieve.execute.mock
        .calls[0][0] as RetrieveFileContentCommand;
      expect(detectFileType(sent.fileType, sent.fileName)).toBe(type);
    },
  );

  it('records a download beyond the upload limit as too large', async () => {
    const { reader, client } = setup();
    client.downloadFile.mockRejectedValue(
      new OparlFileTooLargeError(URL, 25 * 1024 * 1024),
    );

    await expect(reader.read(pendingFile(), signal)).resolves.toMatchObject({
      status: OparlFileTextStatus.SKIPPED,
      reason: OparlFileSkipReason.TOO_LARGE,
    });
  });

  it.each([
    [new TooManyPagesError(), OparlFileSkipReason.TOO_MANY_PAGES],
    [
      new UnprocessableDocumentError('The PDF is malformed'),
      OparlFileSkipReason.UNREADABLE,
    ],
  ])(
    'keeps a file the page limit or the parser rejects as metadata with the reason (%s)',
    async (error, reason) => {
      const { reader, preflight } = setup();
      preflight.execute.mockRejectedValue(error);

      await expect(reader.read(pendingFile(), signal)).resolves.toMatchObject({
        status: OparlFileTextStatus.SKIPPED,
        reason,
        contentHash: PDF_HASH,
      });
    },
  );

  it('reports an unreachable file as failed, to be tried again', async () => {
    const { reader, client } = setup();
    client.downloadFile.mockRejectedValue(
      new OparlRequestFailedError(URL, 503, true),
    );

    await expect(reader.read(pendingFile(), signal)).resolves.toMatchObject({
      status: OparlFileTextStatus.FAILED,
    });
  });
});
