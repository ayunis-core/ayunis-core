import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamPermittedModelsQuery } from './get-team-permitted-models.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class GetTeamPermittedModelsUseCase {
  private readonly logger = new Logger(GetTeamPermittedModelsUseCase.name);

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetTeamPermittedModelsQuery,
  ): Promise<PermittedLanguageModel[]> {
    this.logger.log('execute', {
      teamId: query.teamId,
      orgId: query.orgId,
    });

    this.validator.validateAdminAccess(query.orgId);
    await this.validator.validateTeamInOrg(query.teamId, query.orgId);

    return await this.permittedModelsRepository.findManyLanguageByTeam(
      query.teamId,
      query.orgId,
    );
  }
}
