import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { CreatePermittedProviderCommand } from './create-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';

@Injectable()
export class CreatePermittedProviderUseCase {
  private readonly logger = new Logger(CreatePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
  ) {}

  async execute(
    command: CreatePermittedProviderCommand,
  ): Promise<PermittedProvider> {
    try {
      const permittedProvider = await this.permittedProvidersRepository.create(
        command.orgId,
        command.permittedProvider,
      );
      return permittedProvider;
    } catch (error) {
      if (error instanceof ModelError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(error);
    }
  }
}
