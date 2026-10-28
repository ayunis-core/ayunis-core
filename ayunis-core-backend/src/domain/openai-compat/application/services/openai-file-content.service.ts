import { Injectable } from '@nestjs/common';
import { RetrieveFileContentCommand } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.command';
import { RetrieveFileContentUseCase } from 'src/domain/retrievers/file-retrievers/application/use-cases/retrieve-file-content/retrieve-file-content.use-case';
import { detectFileType } from 'src/common/util/file-type';
import {
  OpenAIContentTooLargeError,
  OpenAIInvalidRequestError,
} from 'src/domain/openai-compat/application/openai-compat.errors';
import type {
  OpenAIChatCompletionFilePart,
  OpenAIChatCompletionMessage,
  OpenAIChatCompletionRequest,
} from 'src/domain/openai-compat/application/types/openai-request.types';

export const OPENAI_COMPAT_MAX_FILE_BYTES = 3 * 1024 * 1024;
export const OPENAI_COMPAT_MAX_FILES = 5;
export const OPENAI_COMPAT_MAX_PDF_PAGES = 50;
export const OPENAI_COMPAT_MAX_EXTRACTED_TEXT_CHARS = 512_000;

const DEFAULT_MIME_TYPE = 'application/octet-stream';

interface EncodedFile {
  part: OpenAIChatCompletionFilePart;
  filename: string;
  mimeType: string;
  base64: string;
  decodedSize: number;
}

interface DecodedFile extends Omit<EncodedFile, 'base64' | 'decodedSize'> {
  data: Buffer;
}

@Injectable()
export class OpenAIFileContentService {
  constructor(
    private readonly retrieveFileContentUseCase: RetrieveFileContentUseCase,
  ) {}

  async expand(
    request: OpenAIChatCompletionRequest,
  ): Promise<OpenAIChatCompletionRequest> {
    const encodedFiles = this.collectFiles(request.messages);
    if (encodedFiles.length === 0) return request;
    if (encodedFiles.length > OPENAI_COMPAT_MAX_FILES) {
      throw new OpenAIInvalidRequestError(
        `A request may contain at most ${OPENAI_COMPAT_MAX_FILES} files`,
        { fileCount: encodedFiles.length, maxFiles: OPENAI_COMPAT_MAX_FILES },
      );
    }

    this.assertCombinedFileSize(encodedFiles);
    const files = encodedFiles.map((file) => this.decode(file));
    const replacements = await this.extractFiles(files);

    return {
      ...request,
      messages: request.messages.map((message) =>
        this.replaceFileParts(message, replacements),
      ),
    };
  }

  private collectFiles(messages: OpenAIChatCompletionMessage[]): EncodedFile[] {
    const files: EncodedFile[] = [];
    for (const message of messages) {
      if (!Array.isArray(message.content)) continue;
      for (const rawPart of message.content as unknown[]) {
        if (!isFilePart(rawPart)) continue;
        if (message.role !== 'user') {
          throw new OpenAIInvalidRequestError(
            'file content parts are only supported in user messages',
          );
        }
        files.push(this.parseFile(rawPart));
      }
    }
    return files;
  }

  private parseFile(part: OpenAIChatCompletionFilePart): EncodedFile {
    const file = (part as { file?: unknown }).file;
    if (!file || typeof file !== 'object') {
      throw new OpenAIInvalidRequestError(
        'file content part must include a file object',
      );
    }
    const payload = file as {
      filename?: unknown;
      file_data?: unknown;
      file_id?: unknown;
    };
    if (typeof payload.file_id === 'string' && payload.file_id.length > 0) {
      throw new OpenAIInvalidRequestError(
        'file_id is not supported; send filename and file_data inline',
      );
    }
    if (
      typeof payload.filename !== 'string' ||
      payload.filename.trim().length === 0
    ) {
      throw new OpenAIInvalidRequestError(
        'inline file content must include a filename',
      );
    }
    if (
      typeof payload.file_data !== 'string' ||
      payload.file_data.length === 0
    ) {
      throw new OpenAIInvalidRequestError(
        'inline file content must include Base64 file_data',
      );
    }

    const parsed = this.parseBase64(payload.file_data);
    const mimeType = this.resolveSupportedMimeType(
      parsed.mimeType,
      payload.filename,
    );
    return { part, filename: payload.filename, ...parsed, mimeType };
  }

  private parseBase64(fileData: string): {
    mimeType: string;
    base64: string;
    decodedSize: number;
  } {
    const parsed = fileData.startsWith('data:')
      ? parseDataUri(fileData)
      : { mimeType: DEFAULT_MIME_TYPE, base64: fileData };
    const base64 = normalizeBase64(parsed.base64);
    return {
      mimeType: parsed.mimeType,
      base64,
      decodedSize: Math.floor((base64.length * 3) / 4),
    };
  }

  private resolveSupportedMimeType(mimeType: string, filename: string): string {
    const filenameType = detectFileType(DEFAULT_MIME_TYPE, filename);
    if (filenameType !== 'pdf' && filenameType !== 'txt') {
      throw new OpenAIInvalidRequestError(
        'Inline files currently support PDF or text documents only',
        { filename, fileType: filenameType },
      );
    }
    const declaredType =
      mimeType === 'text/plain' ? 'txt' : detectFileType(mimeType, '');
    const isGenericMime = mimeType === DEFAULT_MIME_TYPE;
    if (!isGenericMime && declaredType !== filenameType) {
      throw new OpenAIInvalidRequestError(
        'Inline file MIME type does not match its filename',
        { filename, filenameType, declaredType },
      );
    }
    if (!isGenericMime) return mimeType;
    return filenameType === 'pdf' ? 'application/pdf' : 'text/plain';
  }

  private assertCombinedFileSize(files: EncodedFile[]): void {
    const totalBytes = files.reduce((sum, file) => sum + file.decodedSize, 0);
    if (totalBytes > OPENAI_COMPAT_MAX_FILE_BYTES) {
      throw new OpenAIContentTooLargeError(
        'Combined inline file data exceeds the 3 MiB limit',
        { totalBytes, maxBytes: OPENAI_COMPAT_MAX_FILE_BYTES },
      );
    }
  }

  private decode(file: EncodedFile): DecodedFile {
    return {
      part: file.part,
      filename: file.filename,
      mimeType: file.mimeType,
      data: Buffer.from(padBase64(file.base64), 'base64'),
    };
  }

  private async extractFiles(
    files: DecodedFile[],
  ): Promise<Map<OpenAIChatCompletionFilePart, string>> {
    const replacements = new Map<OpenAIChatCompletionFilePart, string>();
    let totalChars = 0;
    for (const file of files) {
      const text = await this.extractFile(file, totalChars);
      totalChars += text.length;
      replacements.set(file.part, formatDocument(file.filename, text));
    }
    return replacements;
  }

  private async extractFile(
    file: DecodedFile,
    previouslyExtractedChars: number,
  ): Promise<string> {
    const result = await this.retrieveFileContentUseCase.execute(
      new RetrieveFileContentCommand({
        fileData: file.data,
        fileName: file.filename,
        fileType: file.mimeType,
        allowLocalPdfParsing: false,
        pdfPageLimit: OPENAI_COMPAT_MAX_PDF_PAGES + 1,
      }),
    );
    const isPdf = detectFileType(DEFAULT_MIME_TYPE, file.filename) === 'pdf';
    if (isPdf && result.pages.length > OPENAI_COMPAT_MAX_PDF_PAGES) {
      throw new OpenAIInvalidRequestError(
        `Inline PDFs may contain at most ${OPENAI_COMPAT_MAX_PDF_PAGES} pages`,
        {
          pageCount: result.pages.length,
          maxPages: OPENAI_COMPAT_MAX_PDF_PAGES,
        },
      );
    }
    this.assertExtractedTextSize(result.pages, previouslyExtractedChars);
    return result.pages.map((page) => page.text).join('\n\n');
  }

  private assertExtractedTextSize(
    pages: Array<{ text: string }>,
    previouslyExtractedChars: number,
  ): void {
    const separatorChars = Math.max(0, pages.length - 1) * 2;
    const totalChars = pages.reduce(
      (total, page) => total + page.text.length,
      previouslyExtractedChars + separatorChars,
    );
    if (totalChars > OPENAI_COMPAT_MAX_EXTRACTED_TEXT_CHARS) {
      throw new OpenAIContentTooLargeError(
        'Combined extracted text exceeds the inline document limit',
        { totalChars, maxChars: OPENAI_COMPAT_MAX_EXTRACTED_TEXT_CHARS },
      );
    }
  }

  private replaceFileParts(
    message: OpenAIChatCompletionMessage,
    replacements: Map<OpenAIChatCompletionFilePart, string>,
  ): OpenAIChatCompletionMessage {
    if (!Array.isArray(message.content)) return message;
    const content = (message.content as unknown[]).map((part) => {
      if (!isFilePart(part)) return part;
      return { type: 'text', text: replacements.get(part) ?? '' };
    });
    return {
      ...message,
      content: content as OpenAIChatCompletionMessage['content'],
    };
  }
}

function isFilePart(value: unknown): value is OpenAIChatCompletionFilePart {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as { type?: unknown }).type === 'file'
  );
}

function parseDataUri(fileData: string): {
  mimeType: string;
  base64: string;
} {
  const commaIndex = fileData.indexOf(',');
  if (commaIndex < 0) throw invalidBase64Error();

  const metadata = fileData.slice(5, commaIndex).split(';');
  const encoding = metadata.at(-1)?.toLowerCase();
  if (encoding !== 'base64') throw invalidBase64Error();

  return {
    mimeType: metadata[0] || DEFAULT_MIME_TYPE,
    base64: fileData.slice(commaIndex + 1),
  };
}

function normalizeBase64(value: string): string {
  const { unpadded, paddingLength } = stripBase64Padding(value.trim());
  if (
    paddingLength > 2 ||
    unpadded.length === 0 ||
    unpadded.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]+$/.test(unpadded)
  ) {
    throw invalidBase64Error();
  }
  return unpadded;
}

function stripBase64Padding(value: string): {
  unpadded: string;
  paddingLength: number;
} {
  let end = value.length;
  while (end > 0 && value[end - 1] === '=') end--;
  return { unpadded: value.slice(0, end), paddingLength: value.length - end };
}

function padBase64(value: string): string {
  return value.padEnd(Math.ceil(value.length / 4) * 4, '=');
}

function invalidBase64Error(): OpenAIInvalidRequestError {
  return new OpenAIInvalidRequestError('file_data must contain valid Base64');
}

function formatDocument(filename: string, text: string): string {
  const safeFilename = filename
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim();
  return `[Document: ${safeFilename}]\n${text}\n[End document]`;
}
