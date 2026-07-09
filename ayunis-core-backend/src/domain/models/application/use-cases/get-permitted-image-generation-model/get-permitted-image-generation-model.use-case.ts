import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import {
  PermittedImageGenerationModelNotFoundForOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { ModelPolicyService } from '../../services/model-policy.service';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';

/**
 * Resolves the image-generation model effectively available to the current
 * user. Image generation is team-restrictable: when the user belongs to one or
 * more teams with model overrides enabled, image generation is only available
 * if the org's image-generation model has been assigned to one of those teams.
 * Users in no override team fall back to the org-level permitted model.
 */
@Injectable()
export class GetPermittedImageGenerationModelUseCase {
  private readonly logger = new Logger(
    GetPermittedImageGenerationModelUseCase.name,
  );

  constructor(
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
    private readonly findTeamsByUserIdUseCase: FindTeamsByUserIdUseCase,
  ) {}

  async execute(
    query: GetPermittedImageGenerationModelQuery,
  ): Promise<PermittedImageGenerationModel> {
    this.logger.log('execute', {
      orgId: query.orgId,
    });

    try {
      this.validateOrgAccess(query.orgId);

      const userId = this.contextService.get('userId');
      const model = await this.resolveEffectiveModel(query.orgId, userId);
      if (!model || !(model instanceof PermittedImageGenerationModel)) {
        throw new PermittedImageGenerationModelNotFoundForOrgError(query.orgId);
      }

      this.modelPolicy.assertSupported(model.model);
      return model;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new UnexpectedModelError(error as Error);
    }
  }

  private validateOrgAccess(queryOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    const isSuperAdmin = systemRole === SystemRole.SUPER_ADMIN;
    const isFromOrg = orgId === queryOrgId;
    if (!isFromOrg && !isSuperAdmin) {
      throw new UnauthorizedAccessError();
    }
  }

  private async resolveEffectiveModel(
    orgId: UUID,
    userId: UUID | undefined,
  ): Promise<PermittedImageGenerationModel | null> {
    if (!userId) {
      return this.permittedModelsRepository.findOneImageGeneration(orgId);
    }

    const teams = await this.findTeamsByUserIdUseCase.execute(
      new FindTeamsByUserIdQuery(userId),
    );
    const overrideTeams = teams.filter(
      (team) => team.orgId === orgId && team.modelOverrideEnabled,
    );

    if (overrideTeams.length === 0) {
      return this.permittedModelsRepository.findOneImageGeneration(orgId);
    }

    return this.resolveTeamModel(overrideTeams, orgId);
  }

  private async resolveTeamModel(
    overrideTeams: { id: UUID }[],
    orgId: UUID,
  ): Promise<PermittedImageGenerationModel | null> {
    const teamModelArrays = await Promise.all(
      overrideTeams.map((team) =>
        this.permittedModelsRepository.findManyImageGenerationByTeam(
          team.id,
          orgId,
        ),
      ),
    );
    for (const teamModels of teamModelArrays) {
      if (teamModels.length > 0) {
        return teamModels[0];
      }
    }
    return null;
  }
}
