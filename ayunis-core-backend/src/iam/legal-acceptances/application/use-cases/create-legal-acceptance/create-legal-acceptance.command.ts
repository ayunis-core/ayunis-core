import { UUID } from 'crypto';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';

export abstract class CreateLegalAcceptanceCommand {
  userId: UUID;
  orgId: UUID;
  type: LegalAcceptanceType;

  constructor(params: {
    userId: UUID;
    orgId: UUID;
    type: LegalAcceptanceType;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
  }
}

export class CreateTosAcceptanceCommand extends CreateLegalAcceptanceCommand {
  constructor(params: { userId: UUID; orgId: UUID }) {
    super({
      ...params,
      type: LegalAcceptanceType.TERMS_OF_SERVICE,
    });
  }
}

export class CreatePrivacyPolicyAcceptanceCommand extends CreateLegalAcceptanceCommand {
  constructor(params: { userId: UUID; orgId: UUID }) {
    super({
      ...params,
      type: LegalAcceptanceType.PRIVACY_POLICY,
    });
  }
}

export class CreateModelProviderAcceptanceCommand extends CreateLegalAcceptanceCommand {
  provider: ModelProvider;

  constructor(params: { userId: UUID; orgId: UUID; provider: ModelProvider }) {
    super({
      ...params,
      type: LegalAcceptanceType.MODEL_PROVIDER,
    });
    this.provider = params.provider;
  }
}
