import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';

export abstract class CreateLegalAcceptanceCommand {
  userId: string;
  orgId: string;
  type: LegalAcceptanceType;

  constructor(params: {
    userId: string;
    orgId: string;
    type: LegalAcceptanceType;
  }) {
    this.userId = params.userId;
    this.orgId = params.orgId;
    this.type = params.type;
  }
}

export class CreateTosAcceptanceCommand extends CreateLegalAcceptanceCommand {
  constructor(params: { userId: string; orgId: string }) {
    super({
      ...params,
      type: LegalAcceptanceType.TERMS_OF_SERVICE,
    });
  }
}

export class CreatePrivacyPolicyAcceptanceCommand extends CreateLegalAcceptanceCommand {
  constructor(params: { userId: string; orgId: string }) {
    super({
      ...params,
      type: LegalAcceptanceType.PRIVACY_POLICY,
    });
  }
}

export class CreateModelProviderAcceptanceCommand extends CreateLegalAcceptanceCommand {
  provider: ModelProvider;

  constructor(params: {
    userId: string;
    orgId: string;
    provider: ModelProvider;
  }) {
    super({
      ...params,
      type: LegalAcceptanceType.MODEL_PROVIDER,
    });
    this.provider = params.provider;
  }
}
