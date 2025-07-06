import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { DeletePermittedProviderCommand } from './delete-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../get-permitted-models/get-permitted-models.query';
import { DeletePermittedModelUseCase } from '../delete-permitted-model/delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../delete-permitted-model/delete-permitted-model.command';

@Injectable()
export class DeletePermittedProviderUseCase {
  private readonly logger = new Logger(DeletePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
  ) {}

  async execute(command: DeletePermittedProviderCommand): Promise<void> {
    try {
      this.logger.debug(
        `Deleting permitted provider ${command.permittedProvider} for organization ${command.orgId}`,
      );

      // TODO: Make this a single transaction

      const permittedModels = await this.getPermittedModelsUseCase.execute(
        new GetPermittedModelsQuery(command.orgId, {
          provider: command.permittedProvider.provider,
        }),
      );
      this.logger.debug('Found permitted models', {
        permittedModels,
      });
      // We need to trigger a use case here instead of cascading
      // because lots of things need to be cleaned up
      await Promise.all(
        permittedModels.map((model) =>
          this.deletePermittedModelUseCase.execute(
            new DeletePermittedModelCommand({
              orgId: command.orgId,
              permittedModelId: model.id,
            }),
          ),
        ),
      );
      await this.permittedProvidersRepository.delete(
        command.orgId,
        command.permittedProvider,
      );
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(error);
    }
  }
}
