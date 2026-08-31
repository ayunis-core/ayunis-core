import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { RunNoModelFoundError } from 'src/domain/runs/application/runs.errors';

interface ResolveEffectiveRunModelParams {
  readonly storedPermit: PermittedLanguageModel;
  readonly orgId: UUID;
  readonly userId: UUID;
}

@Injectable()
export class EffectiveRunModelResolverService {
  constructor(
    private readonly getEffectiveLanguageModelsUseCase: GetEffectiveLanguageModelsUseCase,
  ) {}

  async resolve({
    storedPermit,
    orgId,
    userId,
  }: ResolveEffectiveRunModelParams): Promise<PermittedLanguageModel> {
    const { models } = await this.getEffectiveLanguageModelsUseCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );
    const effectivePermit = models.find(
      (permit) => permit.model.id === storedPermit.model.id,
    );
    if (!effectivePermit) {
      throw new RunNoModelFoundError({
        orgId,
        userId,
        catalogModelId: storedPermit.model.id,
      });
    }
    return effectivePermit;
  }
}
