import { Injectable, Logger } from '@nestjs/common';
import { ClearDefaultsByCatalogModelIdCommand } from './clear-defaults-by-catalog-model-id.command';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';

@Injectable()
export class ClearDefaultsByCatalogModelIdUseCase {
  private readonly logger = new Logger(
    ClearDefaultsByCatalogModelIdUseCase.name,
  );

  constructor(
    private readonly defaultModelSelectionsRepository: DefaultModelSelectionsRepository,
  ) {}

  async execute(command: ClearDefaultsByCatalogModelIdCommand): Promise<void> {
    this.logger.log(
      { catalogModelId: command.catalogModelId },
      'Clearing defaults for archived catalog model',
    );
    // User, team and org defaults that point at any permit of this model.
    await this.defaultModelSelectionsRepository.deleteByCatalogModelId(
      command.catalogModelId,
    );
  }
}
