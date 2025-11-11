import { PermittedProvidersRepository } from 'src/domain/models/application/ports/permitted-providers.repository';
import { DeletePermittedProviderCommand } from './delete-permitted-provider.command';
import { Injectable, Logger } from '@nestjs/common';
import { ModelError, UnexpectedModelError } from '../../models.errors';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { GetPermittedModelsQuery } from '../get-permitted-models/get-permitted-models.query';
import { DeletePermittedModelUseCase } from '../delete-permitted-model/delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from '../delete-permitted-model/delete-permitted-model.command';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class DeletePermittedProviderUseCase {
  private readonly logger = new Logger(DeletePermittedProviderUseCase.name);

  constructor(
    private readonly permittedProvidersRepository: PermittedProvidersRepository,
    private readonly getPermittedModelsUseCase: GetPermittedModelsUseCase,
    private readonly deletePermittedModelUseCase: DeletePermittedModelUseCase,
    private readonly contextService: ContextService,
  ) {}

  @Transactional()
  async execute(command: DeletePermittedProviderCommand): Promise<void> {
    try {
      const orgId = this.contextService.get('orgId');
      const orgRole = this.contextService.get('role');
      const systemRole = this.contextService.get('systemRole');
      const isOrgAdmin = orgRole === UserRole.ADMIN && orgId === command.orgId;
      const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
      if (!isOrgAdmin && !isSuperAdmin) {
        throw new UnauthorizedAccessError();
      }
      this.logger.debug(
        `Deleting permitted provider ${command.permittedProvider.provider} for organization ${command.orgId}`,
      );

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
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(error);
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
