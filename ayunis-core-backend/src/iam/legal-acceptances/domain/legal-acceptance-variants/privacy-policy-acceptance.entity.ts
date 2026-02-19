import type { UUID } from 'crypto';
import { LegalAcceptance } from '../legal-acceptance.entity';
import { LegalAcceptanceType } from '../value-objects/legal-acceptance-type.enum';

export class PrivacyPolicyAcceptance extends LegalAcceptance {
  constructor(params: {
    id?: UUID;
    userId: UUID;
    orgId: UUID;
    version: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super({
      ...params,
      type: LegalAcceptanceType.PRIVACY_POLICY,
    });
  }
}
