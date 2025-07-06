import { LegalAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance.entity';
import { LegalAcceptanceType } from '../../domain/value-objects/legal-acceptance-type.enum';

export abstract class LegalAcceptancesRepository {
  abstract create(legalAcceptance: LegalAcceptance): Promise<void>;
  abstract findOne(
    orgId: string,
    type: LegalAcceptanceType,
    version: string,
  ): Promise<LegalAcceptance | null>;
}
