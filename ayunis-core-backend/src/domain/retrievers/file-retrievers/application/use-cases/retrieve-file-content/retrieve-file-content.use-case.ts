import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { FileRetrieverResult } from '../../../domain/file-retriever-result.entity';
import { RetrieveFileContentCommand } from './retrieve-file-content.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { File } from '../../../domain/file.entity';
import { FileRetrieverType } from '../../../domain/value-objects/file-retriever-type.enum';
import {
  FileRetrieverUnexpectedError,
  InvalidFileTypeError,
} from '../../file-retriever.errors';
import { detectFileType } from 'src/common/util/file-type';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import retrievalConfig from 'src/config/retrieval.config';

@Injectable()
export class RetrieveFileContentUseCase {
  private readonly logger = new Logger(RetrieveFileContentUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly contextService: ContextService,
    @Inject(retrievalConfig.KEY)
    private readonly config: ConfigType<typeof retrievalConfig>,
  ) {}

  async execute(
    command: RetrieveFileContentCommand,
  ): Promise<FileRetrieverResult> {
    this.logger.debug(`Retrieving file content: ${command.fileName}`);
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedException('User not authenticated');
    }
    try {
      let handler: FileRetrieverHandler;
      const fileType = detectFileType(command.fileType, command.fileName);

      if (fileType === 'pdf') {
        // PDF: Prefer Mistral, fallback to Docling, then NPM PDF Parse
        if (this.config.mistral.apiKey) {
          handler = this.fileRetrieverRegistry.getHandler(
            FileRetrieverType.MISTRAL,
          );
        } else if (this.config.docling.serviceUrl) {
          handler = this.fileRetrieverRegistry.getHandler(
            FileRetrieverType.DOCLING,
          );
        } else {
          handler = this.fileRetrieverRegistry.getHandler(
            FileRetrieverType.NPM_PDF_PARSE,
          );
        }
      } else if (fileType === 'docx' || fileType === 'pptx') {
        // DOCX/PPTX: Require Docling
        if (this.config.docling.serviceUrl) {
          handler = this.fileRetrieverRegistry.getHandler(
            FileRetrieverType.DOCLING,
          );
        } else {
          throw new InvalidFileTypeError(fileType);
        }
      } else {
        throw new InvalidFileTypeError(fileType);
      }

      const file = new File(
        command.fileData,
        command.fileName,
        command.fileType,
      );
      return handler.processFile(file);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Unexpected error while retrieving file content', {
        error: error as Error,
      });
      throw new FileRetrieverUnexpectedError(error as Error);
    }
  }
}
