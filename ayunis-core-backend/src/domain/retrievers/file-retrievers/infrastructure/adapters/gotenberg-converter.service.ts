import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosError } from 'axios';
import FormData from 'form-data';
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

function decodeBody(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return '';
}
