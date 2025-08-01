import { Injectable, Logger } from '@nestjs/common';
import { FileRetrieverResult } from '../../../domain/file-retriever-result.entity';
import { ProcessFileCommand } from './process-file.command';
import { FileRetrieverRegistry } from '../../file-retriever-handler.registry';
import { File } from '../../../domain/file.entity';
import { FileRetrieverType } from '../../../domain/value-objects/file-retriever-type.enum';
import { GetAllPermittedProvidersUseCase } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.use-case';
import { GetAllPermittedProvidersQuery } from 'src/domain/models/application/use-cases/get-all-permitted-providers/get-all-permitted-providers.query';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { FileRetrieverProviderNotAvailableError } from '../../file-retriever.errors';

@Injectable()
export class ProcessFileUseCase {
  private readonly logger = new Logger(ProcessFileUseCase.name);

  constructor(
    private readonly fileRetrieverRegistry: FileRetrieverRegistry,
    private readonly getAllPermittedProvidersUseCase: GetAllPermittedProvidersUseCase,
  ) {}

  async execute(command: ProcessFileCommand): Promise<FileRetrieverResult> {
    this.logger.debug(`Processing file: ${command.fileName}`);

    const permittedProviders =
      await this.getAllPermittedProvidersUseCase.execute(
        new GetAllPermittedProvidersQuery(command.orgId),
      );

    if (
      permittedProviders.length === 0 ||
      !permittedProviders.some((p) => p.provider === ModelProvider.MISTRAL)
    ) {
      throw new FileRetrieverProviderNotAvailableError(ModelProvider.MISTRAL);
    }

    const handler = this.fileRetrieverRegistry.getHandler(
      FileRetrieverType.MISTRAL,
    );

    const file = new File(command.fileData, command.fileName);
    return handler.processFile(file);
  }
}
