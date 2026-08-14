import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';

@Injectable()
export class ClearDefaultsByCatalogModelIdUseCase {
  constructor(
    @InjectPinoLogger(ClearDefaultsByCatalogModelIdUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly userDefaultModelsRepository: UserDefaultModelsRepository,
  ) {}

  async execute(command: ClearDefaultsByCatalogModelIdCommand): Promise<void> {
    this.logger.info(
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

    this.logger.info(
      {
        catalogModelId: command.catalogModelId,
        affectedPermittedModels: permittedModelIds.length,
      },
      'Successfully cleared all defaults for archived catalog model',
    );
  }
}
