import { LegalAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance.entity';
import { TosAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/tos-acceptance.entity';
import { PrivacyPolicyAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/privacy-policy-acceptance.entity';
import { ModelProviderAcceptance } from 'src/iam/legal-acceptances/domain/legal-acceptance-variants/model-provider-acceptance.entity';
import { LegalAcceptanceType } from 'src/iam/legal-acceptances/domain/value-objects/legal-acceptance-type.enum';
import {
  LegalAcceptanceRecord,
  TermsOfServiceLegalAcceptanceRecord,
  PrivacyPolicyLegalAcceptanceRecord,
  ModelProviderLegalAcceptanceRecord,
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

    switch (record.type) {
      case LegalAcceptanceType.TERMS_OF_SERVICE:
        return new TosAcceptance(baseParams);

      case LegalAcceptanceType.PRIVACY_POLICY:
        return new PrivacyPolicyAcceptance(baseParams);

      case LegalAcceptanceType.MODEL_PROVIDER:
        const modelProviderRecord =
          record as ModelProviderLegalAcceptanceRecord;
        return new ModelProviderAcceptance({
          ...baseParams,
          provider: modelProviderRecord.modelProvider,
        });

      default:
        throw new Error(`Unknown legal acceptance type: ${record.type}`);
    }
  }

  toRecord(legalAcceptance: LegalAcceptance): LegalAcceptanceRecord {
    switch (legalAcceptance.type) {
      case LegalAcceptanceType.TERMS_OF_SERVICE:
        const tosRecord = new TermsOfServiceLegalAcceptanceRecord();
        tosRecord.id = legalAcceptance.id;
        tosRecord.userId = legalAcceptance.userId;
        tosRecord.orgId = legalAcceptance.orgId;
        tosRecord.version = legalAcceptance.version;
        tosRecord.type = legalAcceptance.type;
        return tosRecord;

      case LegalAcceptanceType.PRIVACY_POLICY:
        const privacyRecord = new PrivacyPolicyLegalAcceptanceRecord();
        privacyRecord.id = legalAcceptance.id;
        privacyRecord.userId = legalAcceptance.userId;
        privacyRecord.orgId = legalAcceptance.orgId;
        privacyRecord.version = legalAcceptance.version;
        privacyRecord.type = legalAcceptance.type;
        return privacyRecord;

      case LegalAcceptanceType.MODEL_PROVIDER:
        const modelProviderRecord = new ModelProviderLegalAcceptanceRecord();
        const modelProviderAcceptance =
          legalAcceptance as ModelProviderAcceptance;
        modelProviderRecord.id = legalAcceptance.id;
        modelProviderRecord.userId = legalAcceptance.userId;
        modelProviderRecord.orgId = legalAcceptance.orgId;
        modelProviderRecord.version = legalAcceptance.version;
        modelProviderRecord.type = legalAcceptance.type;
        modelProviderRecord.modelProvider = modelProviderAcceptance.provider;
        return modelProviderRecord;

      default:
        throw new Error(
          `Unknown legal acceptance type: ${legalAcceptance.type}`,
        );
    }
  }
}
