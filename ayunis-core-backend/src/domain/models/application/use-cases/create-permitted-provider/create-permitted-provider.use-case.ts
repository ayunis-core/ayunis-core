import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { PermittedProvider } from 'src/domain/models/domain/permitted-model-provider.entity';
import { CreatePermittedProviderCommand } from './create-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { UnexpectedModelError } from '../../models.errors';
import { CreateLegalAcceptanceUseCase } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.use-case';
import { CreateModelProviderAcceptanceCommand } from 'src/iam/legal-acceptances/application/use-cases/create-legal-acceptance/create-legal-acceptance.command';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class CreatePermittedProviderUseCase {
  private readonly logger = new Logger(CreatePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly createLegalAcceptanceUseCase: CreateLegalAcceptanceUseCase,
    private readonly contextService: ContextService,
  ) {}

  async execute(
    command: CreatePermittedProviderCommand,
  ): Promise<PermittedProvider> {
    try {
      const userId = this.contextService.get('userId');
      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      if (!userId || !orgId || orgRole !== UserRole.ADMIN) {
        throw new UnauthorizedAccessError({ userId, orgId });
      }
      const noAcceptNeededForProvider: Array<ModelProvider> = [
        ModelProvider.OLLAMA,
        ModelProvider.AYUNIS,
      ];
      const skipLegalAcceptance =
        noAcceptNeededForProvider.includes(
          command.permittedProvider.provider,
        ) || systemRole === SystemRole.SUPER_ADMIN;
      if (!skipLegalAcceptance) {
        await this.createLegalAcceptanceUseCase.execute(
          new CreateModelProviderAcceptanceCommand({
            userId,
            orgId,
            provider: command.permittedProvider.provider,
          }),
        );
      }
      const permittedProvider = await this.permittedProvidersRepository.create(
        orgId,
        command.permittedProvider,
      );
      return permittedProvider;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(error as Error);
    }
  }
}
