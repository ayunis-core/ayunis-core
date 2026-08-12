import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { AxiosError } from 'axios';
import FormData from 'form-data';
import { GotenbergConfig, gotenbergConfig } from 'src/config/gotenberg.config';
import { DocumentConverterPort } from '../../application/ports/document-converter.port';
import {
  DocumentConversionUnavailableError,
  FileRetrievalFailedError,
  FileRetrieverError,
  FileTooLargeError,
  UnprocessableDocumentError,
} from '../../application/file-retriever.errors';

@Injectable()
export class GotenbergConverterService extends DocumentConverterPort {
  private readonly logger = new Logger(GotenbergConverterService.name);
  /** 10 minutes — large documents can take a while to convert */
  private readonly TIMEOUT_MS = 10 * 60 * 1000;

  constructor(
    @Inject(gotenbergConfig.KEY)
    private readonly config: GotenbergConfig,
  ) {
    super();
  }

  /**
   * Convert a document (DOCX, PPTX, etc.) to PDF via Gotenberg's
   * LibreOffice conversion endpoint.
   *
   * @returns PDF file as a Buffer
   */
  async convertToPdf(fileData: Buffer, fileName: string): Promise<Buffer> {
    this.logger.debug(`Converting ${fileName} to PDF via Gotenberg`);

    try {
      const formData = new FormData();
      formData.append('files', fileData, { filename: fileName });
      const response = await axios.post(
        `${this.config.url}/forms/libreoffice/convert`,
        formData,
        {
          headers: formData.getHeaders(),
          responseType: 'arraybuffer',
          timeout: this.TIMEOUT_MS,
        },
      );

      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
      this.logger.debug(
        `Gotenberg conversion complete: ${fileName} → ${pdfBuffer.length} bytes PDF`,
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

    if (status === 503) {
      return new DocumentConversionUnavailableError(fileName);
    }

    if (status === 504 || error.code === 'ECONNABORTED') {
      return new FileRetrievalFailedError(
        `Gotenberg conversion timed out for ${fileName}`,
      );
    }

    if (!error.response) {
      return new FileRetrievalFailedError('Gotenberg service is unreachable');
    }

    return new FileRetrievalFailedError(
      `Gotenberg conversion failed for ${fileName} (HTTP ${status})`,
    );
  }
}
