import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamPermittedModelsQuery } from './get-team-permitted-models.query';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedModelError } from '../../models.errors';
import { TeamPermittedModelValidator } from '../../services/team-permitted-model-validator.service';

@Injectable()
export class GetTeamPermittedModelsUseCase {
  constructor(
    @InjectPinoLogger(GetTeamPermittedModelsUseCase.name)
    private readonly logger: PinoLogger,

    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly validator: TeamPermittedModelValidator,
  ) {}

  async execute(
    query: GetTeamPermittedModelsQuery,
  ): Promise<PermittedLanguageModel[]> {
    this.logger.info(
      {
        teamId: query.teamId,
        orgId: query.orgId,
      },
      'execute',
    );

    try {
      this.validator.validateAdminAccess(query.orgId);
      await this.validator.validateTeamInOrg(query.teamId, query.orgId);

      return await this.permittedModelsRepository.findManyLanguageByTeam(
        query.teamId,
        query.orgId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Error listing team permitted models');
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
