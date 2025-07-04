import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { DeletePermittedProviderCommand } from './delete-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';

@Injectable()
export class DeletePermittedProviderUseCase {
  private readonly logger = new Logger(DeletePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
  ) {}

  async execute(command: DeletePermittedProviderCommand): Promise<void> {
    try {
      this.logger.debug(
        `Deleting permitted provider ${command.permittedProvider} for organization ${command.orgId}`,
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
