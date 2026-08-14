import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamPermittedImageGenerationModelsQuery } from './get-team-permitted-image-generation-models.query';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class GetTeamPermittedImageGenerationModelsUseCase {
  constructor(
    @InjectPinoLogger(GetTeamPermittedImageGenerationModelsUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetTeamPermittedImageGenerationModelsQuery,
  ): Promise<PermittedImageGenerationModel[]> {
    this.logger.info(
      {
        teamId: query.teamId,
        orgId: query.orgId,
      },
      'execute',
    );

    this.validator.validateAdminAccess(query.orgId);
    await this.validator.validateTeamInOrg(query.teamId, query.orgId);

    return this.permittedModelsRepository.findManyImageGenerationByTeam(
      query.teamId,
      query.orgId,
    );
  }
}
