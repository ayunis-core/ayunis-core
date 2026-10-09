import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { OnlyAnonymousModelsAvailableError } from 'src/domain/models/application/models.errors';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { SkillTextImprovementUnavailableError } from 'src/domain/skills/application/skills.errors';

@Injectable()
export class SkillTextModelResolver {
  constructor(
    private readonly getDefaultModelUseCase: GetDefaultModelUseCase,
  ) {}

  async resolve(orgId: UUID, userId: UUID): Promise<PermittedLanguageModel> {
    try {
      return await this.getDefaultModelUseCase.execute(
        new GetDefaultModelQuery({
          orgId,
          userId,
          preferOrganizationDefault: true,
          // Anonymized placeholders must not become permanent skill instructions.
          excludeAnonymousOnly: true,
        }),
      );
    } catch (error) {
      // Only the anonymous-only case gets a skills error: the frontend keys a
      // dedicated hint on SKILL_TEXT_IMPROVEMENT_UNAVAILABLE. Having no model at
      // all is the same situation as in chat, so NO_DEFAULT_MODEL_FOUND passes
      // through unchanged.
      if (error instanceof OnlyAnonymousModelsAvailableError) {
        throw new SkillTextImprovementUnavailableError({ orgId });
      }
      throw error;
    }
  }
}
