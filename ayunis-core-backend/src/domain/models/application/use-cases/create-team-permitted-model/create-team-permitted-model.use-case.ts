import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  ModelNotFoundError,
  ModelNotRestrictableForTeamError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { ModelsRepository } from 'src/domain/models/application/ports/models.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ModelConfigurationService } from 'src/domain/models/application/services/model-configuration.service';
import { TeamPermittedModelValidator } from 'src/domain/models/application/services/team-permitted-model-validator.service';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { CreateTeamPermittedModelCommand } from './create-team-permitted-model.command';

@Injectable()
export class CreateTeamPermittedModelUseCase {
  constructor(
    @InjectPinoLogger(CreateTeamPermittedModelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly modelsRepository: ModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
    private readonly modelConfiguration: ModelConfigurationService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    command: CreateTeamPermittedModelCommand,
  ): Promise<PermittedModel> {
    this.logger.info(
      {
        modelId: command.modelId,
        orgId: command.orgId,
        teamId: command.teamId,
      },
      'execute',
    );

    this.validator.validateAdminAccess(command.orgId);
    await this.validator.validateTeamInOrg(command.teamId, command.orgId);
    const model = await this.modelsRepository.findOne({ id: command.modelId });
    if (!model) {
      throw new ModelNotFoundError(command.modelId);
    }
    if (
      !(model instanceof LanguageModel) &&
      !(model instanceof ImageGenerationModel)
    ) {
      throw new ModelNotRestrictableForTeamError(command.modelId);
    }
    this.modelConfiguration.assertConfiguredAndActive(model);

    return this.permittedModelsRepository.createTeamScoped(
      new PermittedModel({
        model,
        orgId: command.orgId,
        anonymousOnly: command.anonymousOnly,
        scope: PermittedModelScope.TEAM,
        scopeId: command.teamId,
      }),
    );
  }
}
