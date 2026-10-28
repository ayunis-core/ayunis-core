import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { DeleteTeamPermittedModelCommand } from './delete-team-permitted-model.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { DeleteUserDefaultModelsByModelIdUseCase } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { DeleteUserDefaultModelsByModelIdCommand } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.command';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultCommand } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.command';
import { Transactional } from '@nestjs-cls/transactional';

@Injectable()
export class DeleteTeamPermittedModelUseCase {
  private readonly logger = new Logger(DeleteTeamPermittedModelUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
    private readonly deleteUserDefaultModelsByModelIdUseCase: DeleteUserDefaultModelsByModelIdUseCase,
    private readonly replaceModelWithUserDefaultUseCase: ReplaceModelWithUserDefaultUseCase,
  ) {}

  @Transactional()
  async execute(command: DeleteTeamPermittedModelCommand): Promise<void> {
    this.logger.log(
      {
        permittedModelId: command.permittedModelId,
        orgId: command.orgId,
        teamId: command.teamId,
      },
      'execute',
    );

    try {
      this.validator.validateAdminAccess(command.orgId);
      await this.validator.validateTeamInOrg(command.teamId, command.orgId);
      const model = await this.validator.validateModelBelongsToTeam(
        command.permittedModelId,
        command.teamId,
        command.orgId,
      );

      if (model instanceof PermittedLanguageModel) {
        await this.moveUsagesToUserDefault(command, model);
      }

      await this.permittedModelsRepository.delete({
        id: command.permittedModelId,
        orgId: command.orgId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Error deleting team permitted model');
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }

  // Threads would otherwise end up with model = NULL (onDelete: SET NULL) and
  // could no longer be continued. User defaults go first so the replacement
  // falls back to the team, org, or first available model.
  private async moveUsagesToUserDefault(
    command: DeleteTeamPermittedModelCommand,
    model: PermittedLanguageModel,
  ): Promise<void> {
    await this.deleteUserDefaultModelsByModelIdUseCase.execute(
      new DeleteUserDefaultModelsByModelIdCommand(model.id),
    );
    await this.replaceModelWithUserDefaultUseCase.execute(
      new ReplaceModelWithUserDefaultCommand({
        orgId: command.orgId,
        oldPermittedModelId: model.id,
      }),
    );
  }
}
