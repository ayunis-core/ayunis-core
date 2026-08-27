import type { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import {
  FileRetrieverPage,
  FileRetrieverResult,
} from 'src/domain/retrievers/file-retrievers/domain/file-retriever-result.entity';
import type { OpenAIChatCompletionRequest } from 'src/domain/openai-compat/application/types/openai-request.types';
import {
  OPENAI_COMPAT_MAX_EXTRACTED_TEXT_CHARS,
  OPENAI_COMPAT_MAX_FILE_BYTES,
  OPENAI_COMPAT_MAX_FILES,
  OPENAI_COMPAT_MAX_PDF_PAGES,
  OpenAIFileContentService,
} from './openai-file-content.service';

describe('OpenAIFileContentService', () => {
  let retrieveFileContentUseCase: jest.Mocked<RetrieveFileContentUseCase>;
  let service: OpenAIFileContentService;

  beforeEach(() => {
    retrieveFileContentUseCase = {
      execute: jest
        .fn()
        .mockResolvedValue(
          new FileRetrieverResult([
            new FileRetrieverPage('First page', 1),
            new FileRetrieverPage('Second page', 2),
          ]),
        ),
    } as unknown as jest.Mocked<RetrieveFileContentUseCase>;
    service = new OpenAIFileContentService(retrieveFileContentUseCase);
  });

  it('replaces an inline PDF with extracted text in the same content position', async () => {
    const pdf = Buffer.from('%PDF-1.7 municipal budget');
    const request = fileRequest({
      filename: 'municipal-budget.pdf',
      file_data: `data:application/pdf;base64,${pdf.toString('base64')}`,
    });

    const expanded = await service.expand(request);

    expect(expanded.messages[0].content).toEqual([
      {
        type: 'text',
        text:
          '[Document: municipal-budget.pdf]\n' +
          'First page\n\nSecond page\n' +
          '[End document]',
      },
      { type: 'text', text: 'Summarize the document.' },
    ]);
    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileData: pdf,
        fileName: 'municipal-budget.pdf',
        fileType: 'application/pdf',
        allowLocalPdfParsing: false,
        pdfPageLimit: OPENAI_COMPAT_MAX_PDF_PAGES + 1,
      }),
    );
  });

  it('uses the filename to detect a bare Base64 file without a data URI', async () => {
    const pdf = Buffer.from('%PDF-1.7 annual report');
    const request = fileRequest({
      filename: 'annual-report.pdf',
      file_data: pdf.toString('base64'),
    });

    await service.expand(request);

    expect(retrieveFileContentUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: 'annual-report.pdf',
        fileType: 'application/pdf',
        pdfPageLimit: OPENAI_COMPAT_MAX_PDF_PAGES + 1,
      }),
    );
  });

  it('rejects file IDs because the compat API has no Files endpoint', async () => {
    const request = fileRequest({ file_id: 'file-customer-handbook' });

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_INVALID_REQUEST',
      statusCode: 400,
      message: expect.stringContaining('file_id'),
    });
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects malformed Base64 before file processing', async () => {
    const request = fileRequest({
      filename: 'municipal-budget.pdf',
      file_data: 'not valid base64!',
    });

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_INVALID_REQUEST',
      statusCode: 400,
      message: expect.stringContaining('Base64'),
    });
  });

  it('rejects more than five inline files before processing', async () => {
    const request: OpenAIChatCompletionRequest = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: Array.from(
            { length: OPENAI_COMPAT_MAX_FILES + 1 },
            (_, index) => ({
              type: 'file' as const,
              file: {
                filename: `attachment-${index + 1}.txt`,
                file_data: Buffer.from(`Attachment ${index + 1}`).toString(
                  'base64',
                ),
              },
            }),
          ),
        },
      ],
    };

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_INVALID_REQUEST',
      statusCode: 400,
      message: expect.stringContaining('5 files'),
    });
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects combined decoded file bytes above the 3 MiB cap before processing', async () => {
    const oversized = Buffer.alloc(OPENAI_COMPAT_MAX_FILE_BYTES + 1);
    const request = fileRequest({
      filename: 'oversized.pdf',
      file_data: oversized.toString('base64'),
    });

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_CONTENT_TOO_LARGE',
      statusCode: 413,
    });
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a PDF when OCR returns more than 50 pages', async () => {
    retrieveFileContentUseCase.execute.mockResolvedValueOnce(
      new FileRetrieverResult(
        Array.from(
          { length: OPENAI_COMPAT_MAX_PDF_PAGES + 1 },
          (_, index) => new FileRetrieverPage(`Page ${index + 1}`, index + 1),
        ),
      ),
    );
    const request = fileRequest({
      filename: 'long-report.pdf',
      file_data: Buffer.from('%PDF long').toString('base64'),
    });

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_INVALID_REQUEST',
      statusCode: 400,
      message: expect.stringContaining('50 pages'),
    });
  });

  it('rejects extracted text above the inline context cap', async () => {
    retrieveFileContentUseCase.execute.mockResolvedValueOnce(
      new FileRetrieverResult([
        new FileRetrieverPage(
          'x'.repeat(OPENAI_COMPAT_MAX_EXTRACTED_TEXT_CHARS + 1),
          1,
        ),
      ]),
    );
    const request = fileRequest({
      filename: 'dense-report.pdf',
      file_data: Buffer.from('%PDF dense').toString('base64'),
    });

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_CONTENT_TOO_LARGE',
      statusCode: 413,
      message: expect.stringContaining('extracted text'),
    });
  });

  it.each(['text/plain', 'image/png'])(
    'rejects explicit MIME type %s when it conflicts with the filename',
    async (mimeType) => {
      const request = fileRequest({
        filename: 'agenda.pdf',
        file_data: `data:${mimeType};base64,${Buffer.from('not a PDF').toString('base64')}`,
      });

      await expect(service.expand(request)).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_INVALID_REQUEST',
        statusCode: 400,
        message: expect.stringContaining('filename'),
      });
      expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['office document', 'agenda.docx'],
    ['audio file', 'meeting.mp3'],
  ])(
    'rejects an unsupported inline %s before processing',
    async (_, filename) => {
      const request = fileRequest({
        filename,
        file_data: Buffer.from('unsupported bytes').toString('base64'),
      });

      await expect(service.expand(request)).rejects.toMatchObject({
        code: 'OPENAI_COMPAT_INVALID_REQUEST',
        statusCode: 400,
        message: expect.stringContaining('PDF or text'),
      });
      expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it('preserves invalid non-file parts for the request mapper to reject', async () => {
    const request = fileRequest({
      filename: 'agenda.txt',
      file_data: Buffer.from('Council agenda').toString('base64'),
    });
    const content = request.messages[0].content as unknown[];
    content.push(null);

    const expanded = await service.expand(request);

    expect((expanded.messages[0].content as unknown[]).at(-1)).toBeNull();
  });

  it('rejects file parts outside user messages', async () => {
    const request = fileRequest(
      {
        filename: 'assistant-file.pdf',
        file_data: Buffer.from('%PDF assistant').toString('base64'),
      },
      'assistant',
    );

    await expect(service.expand(request)).rejects.toMatchObject({
      code: 'OPENAI_COMPAT_INVALID_REQUEST',
      statusCode: 400,
      message: expect.stringContaining('user messages'),
    });
  });

  it('leaves text-only requests unchanged without invoking file processing', async () => {
    const request: OpenAIChatCompletionRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Summarize the council meeting.' }],
    };

    await expect(service.expand(request)).resolves.toBe(request);
    expect(retrieveFileContentUseCase.execute).not.toHaveBeenCalled();
  });
});

function fileRequest(
  file: { filename?: string; file_data?: string; file_id?: string },
  role: 'user' | 'assistant' = 'user',
): OpenAIChatCompletionRequest {
  return {
    model: 'gpt-4o',
    messages: [
      {
        role,
        content: [
          { type: 'file', file },
          { type: 'text', text: 'Summarize the document.' },
        ],
      },
    ],
  };
}
