import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  EffectiveImageGenerationModelConflictError,
  PermittedImageGenerationModelNotFoundForOrgError,
  UnexpectedModelError,
} from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import { ModelPolicyService } from 'src/domain/models/application/services/model-policy.service';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';

@Injectable()
export class GetPermittedImageGenerationModelUseCase {
  constructor(
    @InjectPinoLogger(GetPermittedImageGenerationModelUseCase.name)
    private readonly logger: PinoLogger,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly contextService: ContextService,
    private readonly modelPolicy: ModelPolicyService,
    private readonly scopeResolver: EffectiveModelScopeResolverService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetPermittedImageGenerationModelQuery,
  ): Promise<PermittedImageGenerationModel> {
    this.logger.info({ orgId: query.orgId }, 'execute');
    this.validateOrgAccess(query.orgId);

    const userId = this.contextService.get('userId');
    const scope = await this.scopeResolver.resolve(query.orgId, userId);
    const model = await this.resolveModel(query.orgId, scope.overrideTeamIds);
    if (!model) {
      throw new PermittedImageGenerationModelNotFoundForOrgError(query.orgId);
    }

    this.modelPolicy.assertSupported(model.model);
    return model;
  }

  private validateOrgAccess(queryOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    if (orgId !== queryOrgId && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }
  }

  private async resolveModel(
    orgId: UUID,
    overrideTeamIds: UUID[],
  ): Promise<PermittedImageGenerationModel | null> {
    if (overrideTeamIds.length === 0) {
      return this.permittedModelsRepository.findOneImageGeneration(orgId);
    }

    const grants =
      await this.permittedModelsRepository.findManyImageGenerationByTeams(
        overrideTeamIds,
        orgId,
      );
    const byCatalogModelId = new Map<UUID, PermittedImageGenerationModel>();
    for (const grant of grants) {
      if (!byCatalogModelId.has(grant.model.id)) {
        byCatalogModelId.set(grant.model.id, grant);
      }
    }
    if (byCatalogModelId.size > 1) {
      throw new EffectiveImageGenerationModelConflictError(orgId, [
        ...byCatalogModelId.keys(),
      ]);
    }
    return [...byCatalogModelId.values()][0] ?? null;
  }
}
