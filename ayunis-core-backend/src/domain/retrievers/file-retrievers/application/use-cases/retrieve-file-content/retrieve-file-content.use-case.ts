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

      if (this.config.docling.serviceUrl) {
        // Use Docling if service URL is configured (priority)
        handler = this.fileRetrieverRegistry.getHandler(
          FileRetrieverType.DOCLING,
        );
      } else if (fileType === 'docx' || fileType === 'pptx') {
        // DOCX/PPTX require Docling - throw error if not available
        throw new InvalidFileTypeError(fileType);
      } else {
        // Use NpmPdfParse as fallback (PDF only)
        handler = this.fileRetrieverRegistry.getHandler(
          FileRetrieverType.NPM_PDF_PARSE,
        );
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
