import { Injectable, Logger } from '@nestjs/common';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { GetTeamPermittedImageGenerationModelsQuery } from './get-team-permitted-image-generation-models.query';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ApplicationError } from 'src/common/errors/base.error';
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

  async execute(
    query: GetTeamPermittedImageGenerationModelsQuery,
  ): Promise<PermittedImageGenerationModel[]> {
    this.logger.log('execute', {
      teamId: query.teamId,
      orgId: query.orgId,
    });

    try {
      this.validator.validateAdminAccess(query.orgId);
      await this.validator.validateTeamInOrg(query.teamId, query.orgId);

      return await this.permittedModelsRepository.findManyImageGenerationByTeam(
        query.teamId,
        query.orgId,
      );
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error(
        'Error listing team permitted image-generation models',
        error,
      );
      throw new UnexpectedModelError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
