import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamPermittedImageGenerationModelsQuery } from './get-team-permitted-image-generation-models.query';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class GetTeamPermittedImageGenerationModelsUseCase {
  private readonly logger = new Logger(
    GetTeamPermittedImageGenerationModelsUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetTeamPermittedImageGenerationModelsQuery,
  ): Promise<PermittedImageGenerationModel[]> {
    this.logger.log('execute', {
      teamId: query.teamId,
      orgId: query.orgId,
    });

    this.validator.validateAdminAccess(query.orgId);
    await this.validator.validateTeamInOrg(query.teamId, query.orgId);

    return this.permittedModelsRepository.findManyImageGenerationByTeam(
      query.teamId,
      query.orgId,
    );
  }
}
