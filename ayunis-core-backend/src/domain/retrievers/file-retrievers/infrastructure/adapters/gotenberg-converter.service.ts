import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { createReadStream, createWriteStream } from 'fs';
import { stat } from 'fs/promises';
import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { GotenbergConfig, gotenbergConfig } from 'src/config/gotenberg.config';
import { ConversionGate } from './conversion-gate';
import { sendToFreeReplica } from './gotenberg-replicas';
import { DocumentConverterPort } from 'src/domain/retrievers/file-retrievers/application/ports/document-converter.port';
import {
  DocumentConversionTimeoutError,
  DocumentConversionUnavailableError,
  DocumentConverterBusyError,
  FileRetrievalFailedError,
  FileRetrieverError,
  FileTooLargeError,
  UnprocessableDocumentError,
} from 'src/domain/retrievers/file-retrievers/application/file-retriever.errors';

@Injectable()
export class GotenbergConverterService extends DocumentConverterPort {
  private readonly logger = new Logger(GotenbergConverterService.name);

  /** 10 minutes — large documents can take a while to convert */
  private readonly TIMEOUT_MS = 10 * 60 * 1000;
  private readonly gate: ConversionGate;

  constructor(
    @Inject(gotenbergConfig.KEY)
    private readonly config: GotenbergConfig,
  ) {
    super();
    this.gate = new ConversionGate(config.maxConcurrentConversions);
  }

  /**
   * Convert a document (DOCX, PPTX, etc.) to PDF via Gotenberg's
   * LibreOffice conversion endpoint.
   *
   * @returns PDF file as a Buffer
   */
  async convertToPdf(fileData: Buffer, fileName: string): Promise<Buffer> {
    this.logger.debug({ fileName }, 'Converting document to PDF via Gotenberg');

    try {
      const response = await this.gate.run(() =>
        sendToFreeReplica(this.config.url, (replicaUrl) => {
          const formData = new FormData();
          formData.append('files', fileData, { filename: fileName });
          return axios.post(
            `${replicaUrl}/forms/libreoffice/convert`,
            formData,
            {
              headers: formData.getHeaders(),
              responseType: 'arraybuffer',
              timeout: this.TIMEOUT_MS,
            },
          );
        }),
      );

      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
      this.logger.debug(
        { fileName, pdfBytes: pdfBuffer.length },
        'Gotenberg conversion complete',
      );

      return pdfBuffer;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.mapConversionError(error, fileName);
      }
      throw error;
    }
  }

  async convertFileToPdf(
    inputPath: string,
    fileName: string,
    outputPath: string,
  ): Promise<{ size: number }> {
    this.logger.debug({ fileName }, 'Converting document to PDF via Gotenberg');

    try {
      await this.gate.run(async () => {
        const response = await sendToFreeReplica(
          this.config.url,
          (replicaUrl) => this.postFile(replicaUrl, inputPath, fileName),
        );
        await this.writeBody(response.data, outputPath, fileName);
      });
      const { size } = await stat(outputPath);
      this.logger.debug(
        { fileName, pdfBytes: size },
        'Gotenberg conversion complete',
      );
      return { size };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.mapConversionError(error, fileName);
      }
      throw error;
    }
  }

  private async postFile(
    replicaUrl: string,
    inputPath: string,
    fileName: string,
  ): Promise<AxiosResponse<Readable>> {
    const formData = new FormData();
    formData.append('files', createReadStream(inputPath), {
      filename: fileName,
    });
    try {
      return await axios.post<Readable>(
        `${replicaUrl}/forms/libreoffice/convert`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'stream',
          timeout: this.TIMEOUT_MS,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );
    } catch (error) {
      // A streamed request streams its error body too. Reading it here, per
      // replica, releases the connection of an occupied replica before the
      // next one is tried.
      if (axios.isAxiosError(error)) await bufferErrorBody(error);
      throw error;
    }
  }

  // axios stops timing a streamed response once its headers arrive, so the
  // body gets its own deadline; a stalled download would otherwise hold the
  // conversion slot forever.
  private async writeBody(
    body: Readable,
    outputPath: string,
    fileName: string,
  ): Promise<void> {
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.TIMEOUT_MS);
    try {
      await pipeline(body, createWriteStream(outputPath), {
        signal: deadline.signal,
      });
    } catch (error) {
      if (deadline.signal.aborted) {
        throw new FileRetrievalFailedError(
          `Gotenberg conversion timed out for ${fileName}`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Only a 400 is attributable to the document. Gotenberg is our own service,
   * so an unreachable host, a timeout or an unexpected status is an outage of
   * ours and must keep alerting on first occurrence (AYC-538).
   */
  private mapConversionError(
    error: AxiosError,
    fileName: string,
  ): FileRetrieverError {
    const status = error.response?.status;

    if (status === 400) {
      return new UnprocessableDocumentError(
        `Gotenberg rejected the document: ${fileName}`,
      );
    }

    if (status === 413) {
      return new FileTooLargeError();
    }

    if (status === 429) {
      return new DocumentConverterBusyError(fileName);
    }

    if (status === 503) {
      return isConversionTimeout(error)
        ? new DocumentConversionTimeoutError(fileName)
        : new DocumentConversionUnavailableError(fileName);
    }

    if (status === 504 || error.code === 'ECONNABORTED') {
      return new FileRetrievalFailedError(
        `Gotenberg conversion timed out for ${fileName}`,
      );
    }

    if (!error.response) {
      return new FileRetrievalFailedError('Gotenberg service is unreachable');
    }

    // A Gotenberg 500 body is only a generic hint naming the upload; the
    // LibreOffice cause is in Gotenberg's own logs, keyed by this id (AYC-1458).
    this.logger.error(
      {
        fileName,
        status,
        gotenbergTrace: error.response.headers['gotenberg-trace'] as
          string | undefined,
      },
      'Gotenberg conversion failed',
    );
    return new FileRetrievalFailedError(
      `Gotenberg conversion failed for ${fileName} (HTTP ${status})`,
    );
  }
}

/**
 * Gotenberg's time-limit 503 is the document's own fault only while every
 * replica runs with --libreoffice-max-queue-size=1, so no request spends its
 * time limit waiting behind another, and --libreoffice-restart-after=1, so a
 * timed-out document does not leave LibreOffice busy for the next one. The
 * sentence is the 8.38+ body; the "context deadline exceeded" cause appears
 * only in Gotenberg's own log (AYC-1741).
 */
function isConversionTimeout(error: AxiosError): boolean {
  return /exceeded the time limit/i.test(decodeBody(error.response?.data));
}

// A streamed request also streams its error body; the mapping reads it as
// text, so it is collected here before the error is classified. It is capped
// in size and in time: the read happens while the conversion slot is held.
const ERROR_BODY_LIMIT_BYTES = 64 * 1024;
const ERROR_BODY_TIMEOUT_MS = 10 * 1000;

async function bufferErrorBody(error: AxiosError): Promise<void> {
  const body: unknown = error.response?.data;
  if (!error.response || !isReadable(body)) return;
  const chunks: Buffer[] = [];
  let size = 0;
  const deadline = setTimeout(() => body.destroy(), ERROR_BODY_TIMEOUT_MS);
  try {
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(String(chunk));
      size += buffer.length;
      if (size > ERROR_BODY_LIMIT_BYTES) break;
      chunks.push(buffer);
    }
  } catch {
    // The status code still classifies the failure without its body.
  } finally {
    clearTimeout(deadline);
  }
  error.response.data = Buffer.concat(chunks);
}

function isReadable(value: unknown): value is Readable {
  return (
    typeof value === 'object' && value !== null && Symbol.asyncIterator in value
  );
}

function decodeBody(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return '';
}
