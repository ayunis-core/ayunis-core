import { LegalAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance.entity';
import { TosAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/tos-acceptance.entity';
import { PrivacyPolicyAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/privacy-policy-acceptance.entity';
import {
  LegalAcceptanceRecord,
  TermsOfServiceLegalAcceptanceRecord,
  PrivacyPolicyLegalAcceptanceRecord,
} from '../schema/legal-acceptance.record';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LegalAcceptancesMapper {
  toDomain(record: LegalAcceptanceRecord): LegalAcceptance {
    const baseParams = {
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record instanceof TermsOfServiceLegalAcceptanceRecord) {
      return new TosAcceptance(baseParams);
    }

    if (record instanceof PrivacyPolicyLegalAcceptanceRecord) {
      return new PrivacyPolicyAcceptance(baseParams);
    }

    throw new Error(`Unknown legal acceptance type: ${record.type}`);
  }

  toRecord(legalAcceptance: LegalAcceptance): LegalAcceptanceRecord {
    if (legalAcceptance instanceof TosAcceptance) {
      const tosRecord = new TermsOfServiceLegalAcceptanceRecord();
      tosRecord.id = legalAcceptance.id;
      tosRecord.userId = legalAcceptance.userId;
      tosRecord.orgId = legalAcceptance.orgId;
      tosRecord.version = legalAcceptance.version;
      tosRecord.type = legalAcceptance.type;
      return tosRecord;
    }

    if (legalAcceptance instanceof PrivacyPolicyAcceptance) {
      const privacyRecord = new PrivacyPolicyLegalAcceptanceRecord();
      privacyRecord.id = legalAcceptance.id;
      privacyRecord.userId = legalAcceptance.userId;
      privacyRecord.orgId = legalAcceptance.orgId;
      privacyRecord.version = legalAcceptance.version;
      privacyRecord.type = legalAcceptance.type;
      return privacyRecord;
    }

    throw new Error(`Unknown legal acceptance type: ${legalAcceptance.type}`);
  }
}
