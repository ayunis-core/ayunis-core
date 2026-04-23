import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';

@Injectable()
export class ClearDefaultsByCatalogModelIdUseCase {
  private readonly logger = new Logger(
    ClearDefaultsByCatalogModelIdUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
  ) {}

  async execute(command: ClearDefaultsByCatalogModelIdCommand): Promise<void> {
    this.logger.log('Clearing org/team defaults for archived catalog model', {
      catalogModelId: command.catalogModelId,
    });

    // User defaults reference the catalog model directly and the fallback
    // logic in GetDefaultModelUseCase skips archived models, so user defaults
    // do not need to be cleared here. Only permitted_models.isDefault flags
    // need to be unset.
    await this.permittedModelsRepository.unsetDefaultsByCatalogModelId(
      command.catalogModelId,
    );
  }
}
