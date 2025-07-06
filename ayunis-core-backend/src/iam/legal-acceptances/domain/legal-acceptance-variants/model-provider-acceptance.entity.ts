import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { LegalAcceptance } from '../legal-acceptance.entity';
import { LegalAcceptanceType } from '../value-objects/legal-acceptance-type.enum';
import { UUID } from 'crypto';

export class ModelProviderAcceptance extends LegalAcceptance {
  provider: ModelProvider;

  constructor(params: {
    id?: UUID;
    userId: string;
    orgId: string;
    version: string;
    provider: ModelProvider;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      type: LegalAcceptanceType.MODEL_PROVIDER,
    });
    this.provider = params.provider;
  }
}
