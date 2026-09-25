import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetOrgDefaultModelQuery } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.query';
import { GetOrgDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-org-default-model/get-org-default-model.use-case';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { SkillTextImprovementUnavailableError } from 'src/domain/skill-authoring/application/skill-authoring.errors';

/**
 * Picks the model that rewrites skill texts. Anonymous-only models are
 * excluded rather than fed anonymized drafts: placeholders would end up in
 * the rewritten skill.
 */
@Injectable()
export class SkillTextModelResolver {
  constructor(
    private readonly getOrgDefaultModelUseCase: GetOrgDefaultModelUseCase,
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async resolve(orgId: UUID, userId: UUID): Promise<PermittedLanguageModel> {
    const { models } = await this.getEffectiveLanguageModelsUseCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );
    const usable = models.filter((model) => !model.anonymousOnly);
    const findUsable = (modelId: string) =>
      usable.find((model) => model.model.id === modelId);

    const orgDefault = await this.getOrgDefaultModelUseCase.execute(
      new GetOrgDefaultModelQuery(orgId),
    );
    const orgPick = orgDefault && findUsable(orgDefault.model.id);
    if (orgPick) return orgPick;

    const callerDefault = await this.getDefaultModelUseCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );
    const pick = findUsable(callerDefault.model.id) ?? usable.at(0);
    if (!pick) throw new SkillTextImprovementUnavailableError({ orgId });
    return pick;
  }
}
