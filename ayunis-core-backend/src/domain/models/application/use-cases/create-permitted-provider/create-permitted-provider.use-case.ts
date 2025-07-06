import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { CreatePermittedProviderCommand } from './create-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import { CreateModelProviderAcceptanceCommand } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.command';

@Injectable()
export class CreatePermittedProviderUseCase {
  private readonly logger = new Logger(CreatePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly createLegalAcceptanceUseCase: CreateLegalAcceptanceUseCase,
  ) {}

  async execute(
    command: CreatePermittedProviderCommand,
  ): Promise<PermittedProvider> {
    try {
      await this.createLegalAcceptanceUseCase.execute(
        new CreateModelProviderAcceptanceCommand({
          userId: command.userId,
          orgId: command.orgId,
          provider: command.permittedProvider.provider,
        }),
      );
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
