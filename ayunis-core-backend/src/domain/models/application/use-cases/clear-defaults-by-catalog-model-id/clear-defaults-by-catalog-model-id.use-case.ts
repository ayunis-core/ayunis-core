import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';

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
    this.logger.log('Clearing defaults for archived catalog model', {
      catalogModelId: command.catalogModelId,
    });

    // 1. Find all permitted models that reference this catalog model
    const permittedModels =
      await this.permittedModelsRepository.findAllByCatalogModelId(
        command.catalogModelId,
      );

    if (permittedModels.length === 0) {
      this.logger.debug('No permitted models found for catalog model', {
        catalogModelId: command.catalogModelId,
      });
      return;
    }

    const permittedModelIds = permittedModels.map((pm) => pm.id);

    this.logger.debug('Found permitted models to clear defaults', {
      catalogModelId: command.catalogModelId,
      permittedModelCount: permittedModelIds.length,
    });

    // 2. Delete all user default models that reference these permitted models
    await this.userDefaultModelsRepository.deleteByPermittedModelIds(
      permittedModelIds,
    );

    // 3. Unset isDefault flag on all permitted models using this catalog model
    await this.permittedModelsRepository.unsetDefaultsByCatalogModelId(
      command.catalogModelId,
    );

    this.logger.log(
      'Successfully cleared all defaults for archived catalog model',
      {
        catalogModelId: command.catalogModelId,
        affectedPermittedModels: permittedModelIds.length,
      },
    );
  }
}
