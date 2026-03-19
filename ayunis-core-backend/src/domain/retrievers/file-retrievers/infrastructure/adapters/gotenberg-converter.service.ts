import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { GotenbergConfig, gotenbergConfig } from 'src/config/gotenberg.config';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { DocumentConverterPort } from '../../application/ports/document-converter.port';
import {
  FileRetrievalFailedError,
  FileTooLargeError,
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
      const response = await retryWithBackoff({
        fn: () => {
          const formData = new FormData();
          formData.append('files', fileData, { filename: fileName });

          return axios.post(
            `${this.config.url}/forms/libreoffice/convert`,
            formData,
            {
              headers: formData.getHeaders(),
              responseType: 'arraybuffer',
              timeout: this.TIMEOUT_MS,
            },
          );
        },
        maxRetries: 3,
        delay: 2000,
        retryIfError: (error) => {
          if (axios.isAxiosError(error) && error.response?.status === 503) {
            this.logger.warn(
              `Gotenberg service busy, retrying... (${fileName})`,
            );
            return true;
          }
          return false;
        },
      });

      const pdfBuffer = Buffer.from(response.data as ArrayBuffer);
      this.logger.debug(
        `Gotenberg conversion complete: ${fileName} → ${pdfBuffer.length} bytes PDF`,
      );

      return pdfBuffer;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 400) {
          throw new FileRetrievalFailedError(
            `Gotenberg rejected the document: ${fileName}`,
          );
        }

        if (status === 413) {
          throw new FileTooLargeError();
        }

        if (status === 504 || error.code === 'ECONNABORTED') {
          throw new FileRetrievalFailedError(
            `Gotenberg conversion timed out for ${fileName}`,
          );
        }

        if (!error.response) {
          throw new FileRetrievalFailedError(
            'Gotenberg service is unreachable',
          );
        }

        throw new FileRetrievalFailedError(
          `Gotenberg conversion failed for ${fileName} (HTTP ${status})`,
        );
      }
      throw error;
    }
  }
}
