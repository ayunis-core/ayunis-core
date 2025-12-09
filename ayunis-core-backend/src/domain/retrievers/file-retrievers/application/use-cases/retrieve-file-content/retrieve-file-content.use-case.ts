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
import { GetAllPermittedProvidersUseCase } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';
import { GetAllPermittedProvidersQuery } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.query';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { FileRetrieverUnexpectedError } from '../../file-retriever.errors';
import { ContextService } from 'src/common/context/services/context.service';
import { ApplicationError } from 'src/common/errors/base.error';
import { FileRetrieverHandler } from '../../ports/file-retriever.handler';
import retrievalConfig from 'src/config/retrieval.config';

@Injectable()
export class RetrieveFileContentUseCase {
  private readonly logger = new Logger(RetrieveFileContentUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly getAllPermittedProvidersUseCase: GetAllPermittedProvidersUseCase,
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
      const permittedProviders =
        await this.getAllPermittedProvidersUseCase.execute(
          new GetAllPermittedProvidersQuery(orgId),
        );

      if (
        permittedProviders.length > 0 &&
        permittedProviders.some((p) => p.provider === ModelProvider.MISTRAL)
      ) {
        // Use Mistral if it is permitted
        handler = this.fileRetrieverRegistry.getHandler(
          FileRetrieverType.MISTRAL,
        );
      } else if (this.config.docling.serviceUrl) {
        // Use Docling if service URL is configured
        handler = this.fileRetrieverRegistry.getHandler(
          FileRetrieverType.DOCLING,
        );
      } else {
        // Use NpmPdfParse as fallback
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
