import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedModelError } from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { EffectiveLanguageModelsResult } from './effective-language-models-result';
import { GetEffectiveLanguageModelsQuery } from './get-effective-language-models.query';

@Injectable()
export class GetEffectiveLanguageModelsUseCase {
  constructor(
    @InjectPinoLogger(GetEffectiveLanguageModelsUseCase.name)
    private readonly logger: PinoLogger,
    private readonly permittedModelsRepository: PermittedModelsRepository,
    private readonly scopeResolver: EffectiveModelScopeResolverService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedModelError)
  async execute(
    query: GetEffectiveLanguageModelsQuery,
  ): Promise<EffectiveLanguageModelsResult> {
    this.logger.info(
      { userId: query.userId, orgId: query.orgId },
      'Resolving effective language models',
    );
    this.validateOrgAccess(query.orgId);

    const scope = await this.scopeResolver.resolve(query.orgId, query.userId);
    if (scope.overrideTeamIds.length === 0) {
      return {
        models: await this.permittedModelsRepository.findManyLanguage(
          query.orgId,
        ),
        overrideTeamIds: [],
      };
    }

    const teamGrants =
      await this.permittedModelsRepository.findManyLanguageByTeams(
        scope.overrideTeamIds,
        query.orgId,
      );
    return {
      models: this.mergeTeamGrants(teamGrants),
      overrideTeamIds: scope.overrideTeamIds,
    };
  }

  private validateOrgAccess(queryOrgId: UUID): void {
    const orgId = this.contextService.get('orgId');
    const systemRole = this.contextService.get('systemRole');
    if (orgId !== queryOrgId && systemRole !== SystemRole.SUPER_ADMIN) {
      throw new UnauthorizedAccessError();
    }
  }

  private mergeTeamGrants(
    models: PermittedLanguageModel[],
  ): PermittedLanguageModel[] {
    const byCatalogModelId = new Map<UUID, PermittedLanguageModel>();
    const grantsByPolicy = [...models].sort((a, b) =>
      this.compareGrantPriority(a, b),
    );
    for (const grant of grantsByPolicy) {
      if (!byCatalogModelId.has(grant.model.id)) {
        byCatalogModelId.set(grant.model.id, grant);
      }
    }
    return [...byCatalogModelId.values()];
  }

  private compareGrantPriority(
    a: PermittedLanguageModel,
    b: PermittedLanguageModel,
  ): number {
    const catalogOrder = a.model.id.localeCompare(b.model.id);
    if (catalogOrder !== 0) return catalogOrder;
    if (a.anonymousOnly !== b.anonymousOnly) return a.anonymousOnly ? -1 : 1;
    return a.id.localeCompare(b.id);
  }
}
