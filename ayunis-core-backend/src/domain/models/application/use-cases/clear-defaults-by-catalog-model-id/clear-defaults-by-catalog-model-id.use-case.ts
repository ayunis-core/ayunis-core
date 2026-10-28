import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';

@Injectable()
export class ClearDefaultsByCatalogModelIdUseCase {
  private readonly logger = new Logger(
    ClearDefaultsByCatalogModelIdUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(command: ClearDefaultsByCatalogModelIdCommand): Promise<void> {
    this.logger.log(
      {
        catalogModelId: command.catalogModelId,
      },
      'Clearing defaults for archived catalog model',
    );

    // 1. Find all permitted models that reference this catalog model
    const permittedModels =
      await this.permittedModelsRepository.findAllByCatalogModelId(
        command.catalogModelId,
      );

    if (permittedModels.length === 0) {
      this.logger.debug(
        {
          catalogModelId: command.catalogModelId,
        },
        'No permitted models found for catalog model',
      );
      return;
    }

    const permittedModelIds = permittedModels.map((pm) => pm.id);

    this.logger.debug(
      {
        catalogModelId: command.catalogModelId,
        permittedModelCount: permittedModelIds.length,
      },
      'Found permitted models to clear defaults',
    );

    // 2. Delete all user default models that reference these permitted models
    await this.userDefaultModelsRepository.deleteByPermittedModelIds(
      permittedModelIds,
    );

    // 3. Unset isDefault flag on all permitted models using this catalog model
    await this.permittedModelsRepository.unsetDefaultsByCatalogModelId(
      command.catalogModelId,
    );

    this.logger.log(
      {
        catalogModelId: command.catalogModelId,
        affectedPermittedModels: permittedModelIds.length,
      },
      'Successfully cleared all defaults for archived catalog model',
    );
  }
}
