import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';

export class GetEffectiveModelInternetAccessQuery {
  constructor(public readonly permittedModel: PermittedLanguageModel) {}
}
