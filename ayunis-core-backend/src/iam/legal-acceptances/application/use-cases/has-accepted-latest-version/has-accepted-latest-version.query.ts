import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';

export class HasAcceptedLatestVersionQuery {
  constructor(
    public readonly orgId: string,
    public readonly type: LegalAcceptanceType,
  ) {}
}
