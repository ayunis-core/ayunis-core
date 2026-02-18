import type { UUID } from 'crypto';
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
